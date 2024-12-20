import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
    console.log('Home component rendering');

    useEffect(() => {
        console.log('Home component mounted - checking elements:', {
            heroElement: document.getElementById('hero')?.getBoundingClientRect(),
            containerStyles: window.getComputedStyle(document.querySelector('.container')),
            hasImage: !!document.querySelector('.hero-img img'),
            visibleElements: Array.from(document.querySelectorAll('[data-aos]')).map(el => ({
                element: el.tagName,
                visibility: window.getComputedStyle(el).visibility,
                opacity: window.getComputedStyle(el).opacity,
                display: window.getComputedStyle(el).display
            }))
        });

        // Force elements to be visible
        const forceVisible = () => {
            document.querySelectorAll('[data-aos]').forEach(el => {
                el.style.visibility = 'visible';
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
        };

        // Try multiple times in case of race conditions
        forceVisible();
        setTimeout(forceVisible, 100);
        setTimeout(forceVisible, 500);
        setTimeout(forceVisible, 1000);
    }, []);

    return (
        <section id="hero" className="hero" style={{display: 'block', visibility: 'visible', opacity: 1}}>
            <div className="container" style={{display: 'block', visibility: 'visible', opacity: 1}}>
                <div className="row" style={{display: 'flex', visibility: 'visible', opacity: 1}}>
                    <div className="col-lg-7 d-flex align-items-center" style={{visibility: 'visible', opacity: 1}}>
                        <div className="content position-relative" style={{visibility: 'visible', opacity: 1}}>
                            <h1 data-aos="fade-up" style={{visibility: 'visible', opacity: 1}}>
                                Transform Your Photos Into Art
                            </h1>
                            <h2 data-aos="fade-up" data-aos-delay="100" style={{visibility: 'visible', opacity: 1}}>
                                Your photo + Our AI = Unique styles
                                <br />
                                Pay only for the art you love
                            </h2>
                            <p data-aos="fade-up" data-aos-delay="200" style={{visibility: 'visible', opacity: 1}}>
                                All art styles are trained ethically on licensed or purchased data.
                                <br />
                                No theft from artists.
                            </p>
                            <div className="buttons" style={{visibility: 'visible', opacity: 1}}>
                                <Link
                                    to="/models"
                                    className="btn-get-started"
                                    data-aos="fade-up"
                                    data-aos-delay="300"
                                    style={{visibility: 'visible', opacity: 1}}
                                >
                                    See Our Styles
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-5 hero-img" data-aos="zoom-out" style={{visibility: 'visible', opacity: 1}}>
                        <img
                            src="/assets/img/painter.webp"
                            className="img-fluid"
                            alt="AI Artist Illustration"
                            style={{visibility: 'visible', opacity: 1}}
                            onError={(e) => {
                                console.error('Image failed to load:', e.target.src);
                                e.target.style.display = 'none';
                            }}
                            onLoad={() => console.log('Hero image loaded successfully')}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Home;