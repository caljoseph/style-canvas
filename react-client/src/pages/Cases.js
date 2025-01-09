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
                <h2 style={{ color: 'var(--heading-color)' }}>Use Cases</h2>
                <p style={{ color: 'var(--default-color)' }}>
                    Discover the possibilities with <strong style={{ color: 'var(--heading-color)' }}>StyleCanvasAI</strong>
                </p>
            </div>

            <div className="container">
                {/* Use row & gy-4 for spacing, "justify-content-center" to center the items if fewer than 4 */}
                <div className="row gy-4 justify-content-center">
                    {useCases.map((useCase, index) => (
                        <div
                            key={index}
                            className="col-xl-3 col-md-6 d-flex"
                            data-aos="fade-up"
                            data-aos-delay={useCase.delay}
                        >
                            <div
                                className="service-item position-relative shadow-sm p-4 rounded-3 w-100"
                                style={{ backgroundColor: 'var(--surface-color)' }}
                            >
                                {/* Bigger icon with accent color */}
                                <div className="mb-3" style={{ fontSize: '2rem', color: 'var(--accent-color)' }}>
                                    <i className={`bi ${useCase.icon}`} />
                                </div>
                                <h5 className="fw-bold" style={{ color: 'var(--heading-color)' }}>
                                    {useCase.title}
                                </h5>
                                <p style={{ color: 'var(--default-color)' }}>
                                    {useCase.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Cases;
