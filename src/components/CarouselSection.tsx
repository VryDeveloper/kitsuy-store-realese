type Figure = {
  image: string;
  title: string;
};

type CarouselSectionProps = {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
  figures: Figure[];
  whatsappLink: string;
  onSelectImage: (img: string) => void;
};

export function CarouselSection({
  id,
  title,
  subtitle,
  gradient,
  figures,
  whatsappLink,
  onSelectImage,
}: CarouselSectionProps) {
  return (
    <section id={id} className="py-16 m-10 rounded-[64px]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in">
          <h2
            className={`fredoka text-4xl md:text-5xl font-display font-bold mb-2 bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
          >
            {title}
          </h2>

          <p className="fredoka text-lg bg-secondary bg-clip-text text-transparent mb-6">
            {subtitle}
          </p>
        </div>

        {/* Carrossel horizontal */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-8 px-4 py-4">
            {figures.map((fig, index) => (
              <div
                key={`${id}-${index}`}
                className="w-[220px] md:w-[260px] min-w-[220px] md:min-w-[260px] bg-white rounded-3xl shadow-xl p-4 flex flex-col transition-all hover:scale-[1.03]"
              >
                <img
                  src={fig.image}
                  alt={fig.title}
                  draggable={false}
                  onClick={() => onSelectImage(fig.image)}
                  className="w-full h-70 object-cover rounded-2xl mb-3 cursor-pointer"
                />

                <h3 className="text-xl font-bold text-black mb-1">
                  {fig.title.length > 50
                    ? fig.title.slice(0, 50) + "..."
                    : fig.title}
                </h3>

                <button
                  className="w-full px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-90 mt-auto"
                  onClick={() => window.open(whatsappLink, "_blank")}
                >
                  Ver Detalhes
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
