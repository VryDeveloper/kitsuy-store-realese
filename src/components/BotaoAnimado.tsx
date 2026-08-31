import { useState } from "react";

function BotaoAnimado() {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);

    // reseta pra permitir clicar de novo
    setTimeout(() => setClicked(false), 200);
  };

  return (
    <button
      onClick={handleClick}
      className={`transition-transform ${
        clicked ? "animate-click-bounce" : ""
      }`}
    >
      Clique aqui
    </button>
  );
}
export default BotaoAnimado;
