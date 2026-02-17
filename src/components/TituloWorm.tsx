const texto = "Últimas unidades do Estoque!";

export default function TituloWorm() {
  return (
    <h2 className="fredoka text-primary pt-3 pb-3 justify-center text-3xl md:text-5xl leading-relaxed font-display font-bold mb-2">
      {texto.split("").map((letra, i) => (
        <span
          key={i}
          className="worm-letter"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          {letra === " " ? "\u00A0" : letra}
        </span>
      ))}
    </h2>
  );
}
