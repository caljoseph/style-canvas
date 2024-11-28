import React from 'react';

const Work = () => {
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
            title: "4. Upload Your Image",
            description: "Click on your chosen model, upload an image, and see a small preview of your transformed photo.",
            delay: "400"
        },
        {
            title: "5. Accept and Download",
            description: "If you like the preview, click accept, and a credit will be deducted from your account. Download the full version of your artwork.",
            delay: "500"
        }
    ];

    return (
        <section id="work" className="faq section light-background">
            <div className="container section-title" data-aos="fade-up">
                <h2>How It Works</h2>
            </div>

            <div className="container">
                {steps.map((step, index) => (
                    <div key={index} className="row faq-item" data-aos="fade-up" data-aos-delay={step.delay}>
                        <div className="col-lg-5 d-flex">
                            <i className="bi bi-question-circle"></i>
                            <h4>{step.title}</h4>
                        </div>
                        <div className="col-lg-7">
                            <p>{step.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Work;