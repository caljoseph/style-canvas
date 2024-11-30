import React from 'react';

const Cases = () => {
    const useCases = [
        {
            icon: 'bi-activity',
            title: '1. Book Covers',
            description: 'Create unique covers for your books.',
            delay: '100'
        },
        {
            icon: 'bi-bounding-box-circles',
            title: '2. Merchandise',
            description: 'Design custom artwork for YouTube or TikTok merchandise.',
            delay: '200'
        },
        {
            icon: 'bi-calendar4-week',
            title: '3. Presentations',
            description: 'Generate distinctive images for presentations or logos.',
            delay: '300'
        },
        {
            icon: 'bi-activity',
            title: '4. Decorations',
            description: 'Print and use as gifts or home decor.',
            delay: '400'
        },
        {
            icon: 'bi-bounding-box-circles',
            title: '5. Social Media Avatars',
            description: 'Create unique avatars for social media profiles.',
            delay: '500'
        }
    ];

    return (
        <section id="cases" className="services section">
            <div className="container section-title" data-aos="fade-up">
                <h2>Use Cases</h2>
                <p>Discover the possibilities with StyleCanvasAI</p>
            </div>

            <div className="container">
                <div className="row gy-4" style={{ justifyContent: 'space-evenly' }}>
                    {useCases.map((useCase, index) => (
                        <div
                            key={index}
                            className="col-xl-3 col-md-6 d-flex"
                            data-aos="fade-up"
                            data-aos-delay={useCase.delay}
                        >
                            <div className="service-item position-relative">
                                <i className={`bi ${useCase.icon}`}></i>
                                <h4>
                                    <a href="" className="stretched-link">
                                        {useCase.title}
                                    </a>
                                </h4>
                                <p>{useCase.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Cases;