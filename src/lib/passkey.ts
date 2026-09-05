"use client";

import { api, ulozToken, type Ucet } from "./ucet";

/**
 * Passkey (WebAuthn) bez knihovny.
 *
 * Účet nemá jméno, e-mail ani heslo. Prohlížeč vytvoří klíč, server si
 * uloží jen jeho veřejnou část. Z toho, co server má, se nedá zjistit,
 * kdo člověk je — a přesto se dá bezpečně poznat, že je to on.
 */

export function podporujePasskey(): boolean {
  return typeof window !== "undefined" && "PublicKeyCredential" in window;
}

const b64u = {
  na: (buf: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  z: (s: string) => {
    const norm = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
    return Uint8Array.from(atob(norm), (c) => c.charCodeAt(0)).buffer;
  },
};

type Json = Record<string, unknown>;

function prevedMoznostiRegistrace(m: Json): PublicKeyCredentialCreationOptions {
  const uzivatel = m.user as Json;
  return {
    ...(m as unknown as PublicKeyCredentialCreationOptions),
    challenge: b64u.z(m.challenge as string),
    user: { ...(uzivatel as unknown as PublicKeyCredentialUserEntity), id: b64u.z(uzivatel.id as string) },
    excludeCredentials: ((m.excludeCredentials as Json[] | undefined) ?? []).map((c) => ({
      ...(c as unknown as PublicKeyCredentialDescriptor),
      id: b64u.z(c.id as string),
    })),
  };
}

function prevedMoznostiPrihlaseni(m: Json): PublicKeyCredentialRequestOptions {
  return {
    ...(m as unknown as PublicKeyCredentialRequestOptions),
    challenge: b64u.z(m.challenge as string),
    allowCredentials: ((m.allowCredentials as Json[] | undefined) ?? []).map((c) => ({
      ...(c as unknown as PublicKeyCredentialDescriptor),
      id: b64u.z(c.id as string),
    })),
  };
}

function serializuj(cred: PublicKeyCredential) {
  const r = cred.response as AuthenticatorAttestationResponse & AuthenticatorAssertionResponse;
  return {
    id: cred.id,
    rawId: b64u.na(cred.rawId),
    type: cred.type,
    authenticatorAttachment: (cred as unknown as { authenticatorAttachment?: string }).authenticatorAttachment,
    clientExtensionResults: cred.getClientExtensionResults(),
    response: {
      clientDataJSON: b64u.na(r.clientDataJSON),
      attestationObject: r.attestationObject ? b64u.na(r.attestationObject) : undefined,
      authenticatorData: r.authenticatorData ? b64u.na(r.authenticatorData) : undefined,
      signature: r.signature ? b64u.na(r.signature) : undefined,
      userHandle: r.userHandle ? b64u.na(r.userHandle) : undefined,
      transports: typeof r.getTransports === "function" ? r.getTransports() : undefined,
    },
  };
}

/** Založí nový anonymní účet. Vrací jednorázový obnovovací kód — ukázat jen jednou. */
export async function registrovat(): Promise<{ ucet: Ucet; obnovovaciKod: string }> {
  const { id, moznosti } = await api<{ id: string; moznosti: Json }>("/auth/registrace/zacit", { method: "POST" });
  const cred = (await navigator.credentials.create({ publicKey: prevedMoznostiRegistrace(moznosti) })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Prohlížeč passkey nevytvořil.");
  const v = await api<{ token: string; ucet: Ucet; obnovovaciKod: string }>("/auth/registrace/dokoncit", {
    method: "POST",
    telo: { id, odpoved: serializuj(cred) },
  });
  ulozToken(v.token);
  return { ucet: v.ucet, obnovovaciKod: v.obnovovaciKod };
}

/** Přihlásí existující účet passkey uloženým v tomto zařízení. */
export async function prihlasit(): Promise<Ucet> {
  const { id, moznosti } = await api<{ id: string; moznosti: Json }>("/auth/prihlaseni/zacit", { method: "POST" });
  const cred = (await navigator.credentials.get({ publicKey: prevedMoznostiPrihlaseni(moznosti) })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Přihlášení bylo zrušeno.");
  const v = await api<{ token: string; ucet: Ucet }>("/auth/prihlaseni/dokoncit", {
    method: "POST",
    telo: { id, odpoved: serializuj(cred) },
  });
  ulozToken(v.token);
  return v.ucet;
}

/** Přihlášení obnovovacím kódem — pro nové zařízení nebo ztracený passkey. */
export async function obnovit(kod: string): Promise<Ucet> {
  const v = await api<{ token: string; ucet: Ucet }>("/auth/obnova", { method: "POST", telo: { kod: kod.trim() } });
  ulozToken(v.token);
  return v.ucet;
}

/** Přidá další passkey k přihlášenému účtu (nové zařízení). */
export async function pridatPasskey(): Promise<void> {
  const { id, moznosti } = await api<{ id: string; moznosti: Json }>("/ja/passkey/zacit", { method: "POST" });
  const cred = (await navigator.credentials.create({ publicKey: prevedMoznostiRegistrace(moznosti) })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Prohlížeč passkey nevytvořil.");
  await api("/ja/passkey/dokoncit", { method: "POST", telo: { id, odpoved: serializuj(cred) } });
}
