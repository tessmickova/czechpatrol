import { nato, pravniStav, provoz } from "@/lib/data";
import { StavovaLista } from "./stavova-lista";

/** Serverová obálka: načte data a předá je klientské liště. */
export function StavovaListaData() {
  return <StavovaLista pravni={pravniStav().polozky} nato={nato().polozky} provoz={provoz().polozky} />;
}
