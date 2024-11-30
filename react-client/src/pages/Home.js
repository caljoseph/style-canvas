import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <>
            <section id="hero" className="hero">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-7 d-flex align-items-center">
                            <div className="content position-relative">
                                <h1 data-aos="fade-up">Transform Your Photos Into Art</h1>
                                <h2 data-aos="fade-up" data-aos-delay="100">
                                    Your photo + Our AI = Unique styles
                                    <br />
                                    Pay only for the art you love
                                </h2>
                                <p data-aos="fade-up" data-aos-delay="200">
                                    All art styles are trained ethically on licensed or purchased data.
                                    <br />
                                    No theft from artists.
                                </p>
                                <div className="buttons">
                                    <Link to="/models" className="btn-get-started" data-aos="fade-up" data-aos-delay="300">
                                        See Our Styles
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-5 hero-img" data-aos="zoom-out">
                            <img src="/assets/img/painter.webp" className="img-fluid" alt="" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Add other home page sections as needed */}
        </>
    );
};

export default Home;