import React from 'react';

const About = () => {
    return (
        <section id="about" className="about section">
            <div className="container section-title" data-aos="fade-up">
                <h2 style={{ color: '#47aeff' }}>About Us</h2>
            </div>

            <div className="container">
                <div className="row gy-5">
                    <div className="content col-xl-5 d-flex flex-column" data-aos="fade-up" data-aos-delay="100">
                        <h1>About</h1>
                        <h5 style={{ marginTop: '20px' }}>
                            StyleCanvasAI was created by Brandon T. Boone, a senior software engineer with
                            a passion for ethical AI. All models are trained on datasets created or purchased by Brandon, ensuring no stolen
                            artwork. Inspired by his experiences hiring artists for his books, Brandon developed this app to provide
                            accessible, custom art for everyone.
                        </h5>
                    </div>

                    <div className="col-xl-7" data-aos="fade-up" data-aos-delay="200">
                        <div className="row gy-4">
                            <div>
                                <div className="order-1 order-lg-2 hero-img" style={{ marginLeft: '60px' }}>
                                    <img src="/assets/img/about-second.png" className="img-fluid animated" alt="" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default About;