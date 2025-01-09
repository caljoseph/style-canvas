import React from 'react';

const ComingSoon = () => {
    // Define the models in development here
    const comingSoonModels = [
        {
            name: "Splatter Brush",
            image: "/assets/coming_soon_thumbnails/Splatter Brush/splatter_brush.png",
            description: "A vibrant paint-splatter effect to make your images pop with color."
        },
        {
            name: "Neon Glow",
            image: "/assets/coming_soon_thumbnails/Neon Glow/neon_glow.png",
            description: "A high-contrast neon glow effect, perfect for futuristic designs."
        },
        {
            name: "Duo Tone",
            image: "/assets/coming_soon_thumbnails/Duo Tone/duo_tone.png",
            description: "A stylish dual-color overlay for bold, eye-catching imagery."
        },
        {
            name: "Mosaic Mixer",
            image: "/assets/coming_soon_thumbnails/Mosaic Mixer/mosaic_mixer.png",
            description: "Transform your photos into a creative mosaic of shapes and patterns."
        },
        {
            name: "Vintage Sketch",
            image: "/assets/coming_soon_thumbnails/Vintage Sketch/vintage_sketch.png",
            description: "Classic sketch style for a timeless, hand-drawn aesthetic."
        },
    ];

    return (
        <section id="coming-soon" className="features section">
            <div className="container section-title" data-aos="fade-up">
                <h2>Coming Soon</h2>
                <p>We're continuously working on new models. Here's a preview of what's on the horizon:</p>
            </div>

            <div className="container">
                <div className="row gy-4">
                    {comingSoonModels.map((model, index) => (
                        <div
                            key={index}
                            className="col-lg-3 col-md-4"
                            data-aos="fade-up"
                            data-aos-delay="100"
                        >
                            <div className="features-item text-center">
                                <img
                                    src={model.image}
                                    alt={model.name}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        borderRadius: '4px',
                                        marginBottom: '10px'
                                    }}
                                />
                                <h3>{model.name}</h3>
                                <p>{model.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ComingSoon;
