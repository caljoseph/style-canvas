import React from 'react';

const Footer = () => {
    return (
        <footer id="footer" className="footer">
            <div className="container">
                <div className="copyright text-center">
                    <p>
                        © <span>Copyright</span>{' '}
                        <strong className="px-1 sitename">StyleCanvasAI</strong>{' '}
                        <span>All Rights Reserved</span>
                    </p>
                </div>
                <div className="social-links d-flex justify-content-center">
                    <a href="https://www.facebook.com/profile.php?id=61572446963586" target="_blank" rel="noopener noreferrer">
                        <i className="bi bi-facebook"></i>
                    </a>
                    <a href="https://www.instagram.com/stylecanvasai/" target="_blank" rel="noopener noreferrer">
                        <i className="bi bi-instagram"></i>
                    </a>
                    <a href="https://www.linkedin.com/in/brandon-boone-60060445/" target="_blank" rel="noopener noreferrer">
                        <i className="bi bi-linkedin"></i>
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;