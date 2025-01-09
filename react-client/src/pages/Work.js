import React from 'react';

const Work = () => {
    // Four-step linear process
    const steps = [
        {
            title: "1. Create an Account",
            description: "Sign up and create your account.",
            delay: "100"
        },
        {
            title: "2. Purchase Credits",
            description: "Buy credits to generate your artistic images.",
            delay: "200"
        },
        {
            title: "3. Choose a Model",
            description: "Select from a grid of available AI models, each represented by an example image and model name.",
            delay: "300"
        },
        {
            title: "4. Upload & Download",
            description: "Upload your image to the chosen model, then download your transformed artwork once it's ready.",
            delay: "400"
        }
    ];

    return (
        <section
            id="work"
            className="faq section light-background"
            style={{
                minHeight: '100vh',
                marginBottom: 0
            }}
        >
            <div className="container section-title" data-aos="fade-up">
                <h2 style={{ color: 'var(--heading-color)' }}>How It Works</h2>
            </div>

            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-lg-8">
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                className="d-flex align-items-start mb-4"
                                data-aos="fade-up"
                                data-aos-delay={step.delay}
                                style={{
                                    backgroundColor: 'var(--surface-color)',
                                    borderRadius: '8px',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                    minHeight: '120px',       // Ensures a taller card
                                    padding: '1.5rem'        // Extra padding for more vertical space
                                }}
                            >
                                {/* Number circle */}
                                <div
                                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '50%',
                                        marginRight: '1.5rem',
                                        backgroundColor: 'var(--accent-color)',
                                        color: 'var(--contrast-color)',
                                        fontWeight: 'bold',
                                        fontSize: '1.2rem'
                                    }}
                                >
                                    {index + 1}
                                </div>

                                {/* Step content */}
                                <div className="flex-grow-1">
                                    <h5
                                        className="fw-bold mb-2"
                                        style={{ color: 'var(--heading-color)' }}
                                    >
                                        {step.title}
                                    </h5>
                                    <p style={{ color: 'var(--default-color)', marginBottom: 0 }}>
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Work;
