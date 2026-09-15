import { describe, expect, it } from "vitest";
import { naliehavost, odhadniZemi, relevantni } from "../sber/udalosti";

/*
  Dvě zprávy, kvůli kterým má člověk sáhnout po telefonu hned: vyhlášená
  mobilizace v Rusku a spuštěné krizové vysílání Českého rozhlasu.

  Testy hlídají obojí — že se takové zprávy zachytí, i že se naléhavost
  nespustí na komentář nebo na zprávu o mobilizaci v jiné zemi. Falešný
  poplach stojí důvěru, kterou web nemá jak získat zpátky.
*/

describe("vyhlášená mobilizace v Rusku", () => {
  const vety = [
    "Putin podepsal ukaz o mobilizaci, Rusko vyhlásilo částečnou mobilizaci",
    "Rusko vyhlásilo všeobecnou mobilizaci, oznámil Kreml",
    "Kreml oznámil vyhlášení mobilizace",
    "Russia orders general mobilisation, Kremlin says",
  ];

  it.each(vety)("projde sítem a je naléhavá: %s", (v) => {
    /*
      Obojí naráz. Dřív to takhle nefungovalo: síto hledalo celé fráze
      („vyhlásil mobilizaci“), takže „Rusko vyhlásilo všeobecnou mobilizaci“
      zahodilo jako zprávu bez skutku — čeština mezi sloveso a předmět vloží
      přívlastek a slovo skloní.
    */
    expect(relevantni(v), "síto zprávu zahodilo").toBe(true);
    expect(naliehavost(v)?.druh).toBe("mobilizace-rusko");
  });

  it("komentář o tom, co by mobilizace znamenala, naléhavý není", () => {
    expect(naliehavost("Komentář: co by znamenala mobilizace v Rusku")).toBeNull();
  });

  it("mobilizace v jiné zemi nespouští ruskou výstrahu", () => {
    expect(naliehavost("Ukrajina prodloužila mobilizaci o dalších 90 dní")).toBeNull();
  });
});

describe("krizové vysílání", () => {
  it.each([
    "Český rozhlas zahájil mimořádné vysílání kvůli situaci",
    "Radiožurnál přechází na mimořádné vysílání",
  ])("zachytí se a určí se jako Česko: %s", (v) => {
    expect(relevantni(v)).toBe(true);
    expect(naliehavost(v)?.druh).toBe("krizove-vysilani");
    expect(odhadniZemi(v)?.kod).toBe("CZ");
  });

  it("mimořádné vysílání bez toho, kdo vysílá, naléhavé není", () => {
    // „Mimořádné vysílání k volbám“ je pořad, ne krizový režim.
    expect(naliehavost("Mimořádné vysílání k výsledkům hlasování")).toBeNull();
  });
});

describe("zkratky zemí se nesmějí trefit doprostřed slova", () => {
  /*
    „uk“ s povolenou koncovkou sedělo na „ukaz“ i „ukrajina“, takže ruský
    ukaz o mobilizaci web označil za zprávu ze Spojeného království. Je to
    týž druh chyby jako dřívější „bis“ uvnitř jména „Babiš“.
  */
  it.each([
    ["Putin podepsal ukaz o mobilizaci, oznámil Kreml", "RU"],
    ["Ukrajina prodloužila mobilizaci o dalších 90 dní", "UA"],
    ["V Británii zadrželi muže obviněného ze špionáže pro Rusko", "GB"],
  ])("%s → %s", (veta, kod) => {
    expect(odhadniZemi(veta)?.kod).toBe(kod);
  });
});
