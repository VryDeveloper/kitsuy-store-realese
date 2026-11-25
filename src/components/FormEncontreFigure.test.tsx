import { describe, expect, it } from "vitest";
import { mensagemEncontreFigure } from "./FormEncontreFigure";

function dados(campos: Record<string, string>) {
  const d = new FormData();
  Object.entries(campos).forEach(([k, v]) => d.append(k, v));
  return d;
}

describe("mensagemEncontreFigure", () => {
  it("inclui só os campos preenchidos", () => {
    expect(mensagemEncontreFigure(dados({ personagem: " Miku ", anime: "", link: "", detalhes: "Nendoroid" }))).toBe(
      "Olá! Vim do site e quero encontrar uma figure:\n• Personagem: Miku\n• Detalhes: Nendoroid",
    );
  });

  it("monta todas as linhas quando tudo vem preenchido", () => {
    const msg = mensagemEncontreFigure(dados({ personagem: "Rem", anime: "Re:Zero", link: "https://x.jp", detalhes: "1/7" }));
    expect(msg.split("\n")).toHaveLength(5);
    expect(msg).toContain("• Link ou referência: https://x.jp");
  });
});
