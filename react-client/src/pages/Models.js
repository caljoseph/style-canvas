import React, { useState, useRef, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import ReactCrop from 'react-image-crop';
import { useAuth } from '../context/AuthContext';
import Config from '../config';
import 'react-image-crop/dist/ReactCrop.css';
import { useNavigate } from 'react-router-dom';

const Models = () => {
    const [selectedModel, setSelectedModel] = useState('');
    const [previewImage, setPreviewImage] = useState(null);
    const [croppedImage, setCroppedImage] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState(null);
    const [isCropping, setIsCropping] = useState(true);
    const [crop, setCrop] = useState(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
    const navigate = useNavigate();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isUpscaling, setIsUpscaling] = useState(false);
    const [originalImage, setOriginalImage] = useState(null);
    const [processingState, setProcessingState] = useState({
        status: 'idle', // idle, uploading, processing, complete, error
        requestHash: null,
        estimatedTime: null,
        progress: 0,
        resultImage: null,
        imageSize: null // track current image size
    });

    const [statusMessage, setStatusMessage] = useState({
        text: "Please upload an image of at least 1024x1024px",
        type: "info"
    });

    const imageRef = useRef(null);
    const pollInterval = useRef(null);
    const { user } = useAuth();

    const MIN_DIMENSION = 1024;
    const DISPLAY_DIMENSION = 400;

    // Prevent navigation while processing
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (processingState.status === 'processing' || processingState.status === 'uploading') {
                e.preventDefault();
                e.returnValue = 'Your image is still processing. Are you sure you want to leave?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
            }
        };
    }, [processingState.status]);

    const models = [
        { name: "Abstract Face Line", image: "/assets/Face Sample/Abstract Face Line/BrennanMcCleary.png" },
        { name: "BlueShadeFace", image: "/assets/Face Sample/Blue Shade Face/BrennanMcCleary.png" },
        { name: "Chalk Drawing", image: "/assets/Face Sample/Chalk Drawing/BrennanMcCleary.png" },
        { name: "Crimson Canvas", image: "/assets/Face Sample/Crimson Canvas/Faces_Dataset_401.png" },
        { name: "Crimson Contour", image: "/assets/Face Sample/Crimson Contour/BrennanMcCleary.png" },
        { name: "Dark Color Blend", image: "/assets/Face Sample/Dark Color Blend/BrennanMcCleary.png" },
        { name: "Dot Line Face", image: "/assets/Face Sample/DotLineFace/BrennanMcCleary.png" },
        { name: "Harmony Hue", image: "/assets/Face Sample/HarmonyHue/BrennanMcCleary.png" },
        { name: "Kai Face", image: "/assets/Face Sample/Kai Face/image_117_image.png" },
        { name: "Line Sketch", image: "/assets/Face Sample/LineSketch/BrennanMcCleary.png" },
    ];

    const validateImageDimensions = (width, height) => {
        if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
            setStatusMessage({
                text: `Image too small: ${width}x${height}px. Minimum required: ${MIN_DIMENSION}x${MIN_DIMENSION}px`,
                type: "error"
            });
            return false;
        }
        setStatusMessage({
            text: `Image size: ${width}x${height}px`,
            type: "success"
        });
        return true;
    };

    const calculateDisplayDimensions = (naturalWidth, naturalHeight) => {
        const aspectRatio = naturalWidth / naturalHeight;
        let displayWidth, displayHeight;

        if (naturalWidth > naturalHeight) {
            displayWidth = Math.min(DISPLAY_DIMENSION, naturalWidth);
            displayHeight = displayWidth / aspectRatio;
        } else {
            displayHeight = Math.min(DISPLAY_DIMENSION, naturalHeight);
            displayWidth = displayHeight * aspectRatio;
        }

        return { width: displayWidth, height: displayHeight };
    };

    const handleModelClick = (modelName) => {
        if (!user) {
            setSelectedModel(modelName);
            setShowAuthModal(true);
            return;
        }

        if (user.tokens < 1) {
            setError("You don't have enough tokens to process an image. Please purchase more tokens to continue.");
            setShowModal(true);
            return;
        }

        setSelectedModel(modelName);
        setShowModal(true);
        setError(null);
        setIsCropping(true);
        setPreviewImage(null);
        setCroppedImage(null);
        setOriginalDimensions({ width: 0, height: 0 });
        setProcessingState({
            status: 'idle',
            requestHash: null,
            estimatedTime: null,
            progress: 0,
            resultImage: null
        });
        setStatusMessage({
            text: "Please upload an image of at least 1024x1024px",
            type: "info"
        });
    };
    const handleAuthModalClose = () => {
        setShowAuthModal(false);
        setSelectedModel('');
    };

    const redirectToRegistration = () => {
        navigate('/registration');
    };
    const onImageLoad = (e) => {
        const { naturalWidth, naturalHeight, width, height } = e.currentTarget;
        setOriginalDimensions({ width: naturalWidth, height: naturalHeight });
        setImgLoaded(true);

        if (!validateImageDimensions(naturalWidth, naturalHeight)) {
            const minDimension = Math.min(width, height);
            setCrop({
                unit: 'px',
                width: minDimension,
                height: minDimension,
                x: (width - minDimension) / 2,
                y: (height - minDimension) / 2,
                aspect: 1
            });
            return;
        }

        const minDimension = Math.min(width, height);
        setCrop({
            unit: 'px',
            width: minDimension,
            height: minDimension,
            x: (width - minDimension) / 2,
            y: (height - minDimension) / 2,
            aspect: 1
        });
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

            if (!validTypes.includes(file.type)) {
                setStatusMessage({
                    text: "Please upload a JPG, PNG, or WebP image",
                    type: "error"
                });
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewImage(e.target.result);
                setCroppedImage(null);
                setIsCropping(true);
                setImgLoaded(false);
                setCrop(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const validateCropDimensions = (crop) => {
        if (!imageRef.current) return false;

        const scaleX = originalDimensions.width / imageRef.current.width;
        const scaleY = originalDimensions.height / imageRef.current.height;

        const cropWidth = Math.round(crop.width * scaleX);
        const cropHeight = Math.round(crop.height * scaleY);

        if (cropWidth < MIN_DIMENSION || cropHeight < MIN_DIMENSION) {
            setStatusMessage({
                text: `Selected area: ${cropWidth}x${cropHeight}px. Please select at least ${MIN_DIMENSION}x${MIN_DIMENSION}px`,
                type: "error"
            });
            return false;
        }
        setStatusMessage({
            text: `Current selection: ${cropWidth}x${cropHeight}px`,
            type: "success"
        });
        return true;
    };

    const getCroppedImage = async (image, crop) => {
        if (!validateCropDimensions(crop)) {
            throw new Error('Invalid crop dimensions');
        }

        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            crop.width,
            crop.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Canvas is empty'));
                        return;
                    }
                    resolve(URL.createObjectURL(blob));
                },
                'image/jpeg',
                1
            );
        });
    };

    const handleCropImage = async () => {
        if (!previewImage) {
            setStatusMessage({
                text: "Please upload an image before cropping",
                type: "error"
            });
            return;
        }

        try {
            const croppedImg = await getCroppedImage(imageRef.current, crop);
            setCroppedImage(croppedImg);
            setIsCropping(false);
            setStatusMessage({ text: "", type: "info" });
        } catch (error) {
            setStatusMessage({
                text: error.message,
                type: "error"
            });
        }
    };

    const fetchProcessedImage = async (requestHash) => {
        try {
            const response = await fetch(`${Config.apiUrl}/image/retrieve/${requestHash}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to retrieve processed image: ${response.status}`);
            }

            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) {
                throw new Error('Received invalid image data');
            }

            const imageUrl = URL.createObjectURL(blob);

            // Create an image element to get dimensions
            const img = new Image();
            img.src = imageUrl;
            await new Promise((resolve) => {
                img.onload = resolve;
            });

            setProcessingState(prev => ({
                ...prev,
                status: 'complete',
                resultImage: imageUrl,
                progress: 100,
                imageSize: {
                    width: img.width,
                    height: img.height
                }
            }));
        } catch (error) {
            console.error('Error in fetchProcessedImage:', error);
            setError('Failed to retrieve the processed image');
            setProcessingState(prev => ({
                ...prev,
                status: 'error',
                progress: 0
            }));
        }
    };

    const pollStatus = async (requestHash) => {
        console.log('Polling status for hash:', requestHash);
        try {
            const response = await fetch(`${Config.apiUrl}/image/status/${requestHash}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                }
            });

            if (!response.ok) {
                throw new Error('Failed to check status');
            }

            const data = await response.json();
            console.log('Poll status response:', data);

            if (data.status === 'completed') {
                console.log('Processing completed, fetching image');
                clearInterval(pollInterval.current);
                await fetchProcessedImage(requestHash);
            } else if (data.status === 'failed') {
                console.log('Processing failed');
                clearInterval(pollInterval.current);
                setError('Processing failed. Please try again.');
                setProcessingState(prev => ({ ...prev, status: 'error' }));
            } else {
                console.log('Still processing, queue position:', data.queuePosition);
                const progress = data.queuePosition === 1 ? 75 :
                    Math.min(50, Math.max(25, 100 - (data.queuePosition * 10)));

                setProcessingState(prev => ({
                    ...prev,
                    progress,
                    estimatedTime: data.estimatedWaitTime
                }));
            }
        } catch (error) {
            console.error('Error in pollStatus:', error);
            clearInterval(pollInterval.current);
            setError('Failed to check processing status');
            setProcessingState(prev => ({ ...prev, status: 'error' }));
        }
    };

    const handleApplyStyle = async () => {
        if (!croppedImage) return;
        console.log('Starting style application');

        // Clear any existing interval
        if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
        }

        try {
            setProcessingState(prev => ({
                ...prev,
                status: 'uploading',
                progress: 25
            }));

            const response = await fetch(croppedImage);
            const blob = await response.blob();
            console.log('Blob created from cropped image:', blob.type, blob.size);

            const formData = new FormData();
            formData.append('image', blob, 'image.png');
            formData.append('modelName', selectedModel);

            console.log('Sending generate request for model:', selectedModel);
            const generateResponse = await fetch(`${Config.apiUrl}/image/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: formData
            });

            if (!generateResponse.ok) {
                const errorData = await generateResponse.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to start image processing');
            }

            const data = await generateResponse.json();
            console.log('Generate response:', data);

            setProcessingState(prev => ({
                ...prev,
                status: 'processing',
                requestHash: data.requestHash,
                estimatedTime: data.estimatedWaitTime,
                progress: 50
            }));

            // Call poll immediately and then set up interval
            await pollStatus(data.requestHash);
            pollInterval.current = setInterval(() => pollStatus(data.requestHash), 3000);

        } catch (error) {
            console.error('Error in handleApplyStyle:', error);
            // Clear interval on error
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
                pollInterval.current = null;
            }
            setError(error.message || 'Failed to process image');
            setProcessingState(prev => ({
                ...prev,
                status: 'error',
                progress: 0
            }));
        }
    };
    useEffect(() => {
        console.log('Processing state changed:', processingState);
    }, [processingState]);

    const handleUpscale = async () => {
        if (!processingState.resultImage) return;

        try {
            setIsUpscaling(true);
            setProcessingState(prev => ({
                ...prev,
                status: 'uploading',
                progress: 25
            }));

            // Convert URL to blob
            const response = await fetch(processingState.resultImage);
            const blob = await response.blob();

            const formData = new FormData();
            formData.append('image', blob, 'image.png');
            formData.append('modelName', 'Upsample');

            const generateResponse = await fetch(`${Config.apiUrl}/image/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: formData
            });

            if (!generateResponse.ok) {
                const errorData = await generateResponse.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to start upscaling');
            }

            const data = await generateResponse.json();

            setProcessingState(prev => ({
                ...prev,
                status: 'processing',
                requestHash: data.requestHash,
                estimatedTime: data.estimatedWaitTime,
                progress: 50
            }));

            if (pollInterval.current) {
                clearInterval(pollInterval.current);
            }

            await pollStatus(data.requestHash);
            pollInterval.current = setInterval(() => pollStatus(data.requestHash), 3000);

        } catch (error) {
            console.error('Error in handleUpscale:', error);
            setError(error.message || 'Failed to upscale image');
            setProcessingState(prev => ({
                ...prev,
                status: 'error',
                progress: 0
            }));
        } finally {
            setIsUpscaling(false);
        }
    };


    const handleDownload = () => {
        if (processingState.resultImage) {
            const link = document.createElement('a');
            link.href = processingState.resultImage;
            link.download = `styled-image-${selectedModel}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleCloseModal = () => {
        if (processingState.status === 'processing' || processingState.status === 'uploading') {
            const confirm = window.confirm(
                'Your image is still processing. If you close this window, you will lose your result. Are you sure you want to continue?'
            );
            if (!confirm) return;

            if (pollInterval.current) {
                clearInterval(pollInterval.current);
            }
        }

        setShowModal(false);
        setPreviewImage(null);
        setCroppedImage(null);
        setSelectedModel('');
        setError(null);
        setIsCropping(true);
        setCrop(null);
        setImgLoaded(false);
        setOriginalDimensions({ width: 0, height: 0 });
        setProcessingState({
            status: 'idle',
            requestHash: null,
            estimatedTime: null,
            progress: 0,
            resultImage: null
        });
    };

    const handleCropChange = (newCrop) => {
        setCrop(newCrop);
        if (newCrop.width && newCrop.height) {
            validateCropDimensions(newCrop);
        }
    };

    return (
        <section id="models" className="features section">
            <div className="container section-title" data-aos="fade-up">
                <h2>Our AI Models</h2>
                <p>Explore our range of AI models, each designed to create a unique artistic style:</p>
            </div>

            <div className="container">
                <div className="row gy-4">
                    {models.map((model, index) => (
                        <div
                            key={index}
                            className="col-lg-3 col-md-4"
                            data-aos="fade-up"
                            data-aos-delay="100"
                        >
                            <div className="features-item" onClick={() => handleModelClick(model.name)}>
                                <img src={model.image} alt={model.name} />
                                <h3>
                                    <a href="#" className="stretched-link">{model.name}</a>
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Authentication Required Modal */}
            <Modal
                show={showAuthModal}
                onHide={handleAuthModalClose}
                centered
                size="md"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Authentication Required</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="text-center">
                        <div className="mb-4">
                            <i className="bi bi-lock text-primary" style={{ fontSize: '3rem' }}></i>
                        </div>
                        <h5 className="mb-3">Want to try {selectedModel}?</h5>
                        <p className="mb-4">Please sign in or create an account to use our AI models.</p>
                        <button
                            className="btn btn-primary btn-lg w-100 mb-3"
                            onClick={redirectToRegistration}
                        >
                            Sign In / Sign Up
                        </button>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Image Processing Modal */}
            <Modal
                show={showModal}
                onHide={handleCloseModal}
                centered
                size="lg"
                backdrop="static"
                keyboard={false}
            >
                <Modal.Header closeButton>
                    <div className="w-100 position-relative d-flex align-items-center">
                        {!isCropping && processingState.status === 'idle' && (
                            <button
                                className="btn btn-secondary me-3"
                                onClick={() => {
                                    setIsCropping(true);
                                    setCroppedImage(null);
                                    setStatusMessage({
                                        text: "Please upload an image of at least 1024x1024px",
                                        type: "info"
                                    });
                                }}
                            >
                                ← Back to Crop
                            </button>
                        )}
                        <Modal.Title>
                            Style: {selectedModel}
                        </Modal.Title>
                    </div>
                </Modal.Header>

                <Modal.Body>
                    {error && (
                        <div className="alert alert-danger mb-3" role="alert">
                            {error}
                        </div>
                    )}

                    {processingState.status === 'processing' || processingState.status === 'uploading' ? (
                        <div className="text-center p-4">
                            <div className="spinner-border text-primary mb-3" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <div className="progress mb-3">
                                <div
                                    className="progress-bar"
                                    role="progressbar"
                                    style={{ width: `${processingState.progress}%` }}
                                    aria-valuenow={processingState.progress}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                >
                                    {processingState.progress}%
                                </div>
                            </div>
                            <p className="mb-3">
                                {processingState.status === 'uploading' ? 'Uploading image...' :
                                    `Processing image... Estimated wait time: ${processingState.estimatedTime}`}
                            </p>
                            <div className="alert alert-warning" role="alert">
                                <strong>Please don't close this window</strong><br/>
                                Your image is being processed. Closing this window will cancel the process.
                            </div>
                        </div>
                    ) : processingState.status === 'complete' ? (
                        <div className="text-center">
                            <div className="alert alert-success mb-3" role="alert">
                                <i className="bi bi-check-circle me-2"></i>
                                Processing Complete!
                            </div>
                            <div className="position-relative mb-3">
                                <img
                                    src={processingState.resultImage}
                                    alt="Styled Result"
                                    className="img-fluid rounded"
                                    style={{ maxHeight: '500px' }}
                                />
                            </div>
                            <div className="card mb-4">
                                <div className="card-body">
                                    <h5 className="card-title mb-3">
                                        Current Resolution: {processingState.imageSize?.width}x{processingState.imageSize?.height}px
                                    </h5>
                                    <div className="d-flex justify-content-center gap-3">
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleDownload}
                                        >
                                            <i className="bi bi-download me-2"></i>
                                            Download Current Resolution
                                        </button>
                                        {processingState.imageSize?.width < 2048 && (
                                            <button
                                                className="btn btn-success"
                                                onClick={handleUpscale}
                                                disabled={isUpscaling || user.tokens < 1}
                                            >
                                                <i className="bi bi-arrows-angle-expand me-2"></i>
                                                {isUpscaling ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                        Upscaling...
                                                    </>
                                                ) : (
                                                    <>Upscale for 1 Token</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    {processingState.imageSize?.width < 2048 && (
                                        <div className="mt-3 text-muted">
                                            <small>
                                                <i className="bi bi-info-circle me-1"></i>
                                                Double the resolution of your image for 1 additional token
                                            </small>
                                        </div>
                                    )}
                                    {user.tokens < 1 && (
                                        <div className="alert alert-warning mt-3 mb-0">
                                            <i className="bi bi-exclamation-triangle me-2"></i>
                                            You need at least 1 token to upscale. Purchase more tokens to continue.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {isCropping && (
                                <div className="mb-3">
                                    {statusMessage.text && (
                                        <div className={`alert alert-${statusMessage.type === 'error' ? 'danger' :
                                            statusMessage.type === 'success' ? 'success' : 'info'} text-center`}>
                                            {statusMessage.text}
                                        </div>
                                    )}
                                    <input
                                        className="form-control"
                                        type="file"
                                        id="imageInput"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleImageUpload}
                                        required
                                    />
                                </div>
                            )}

                            {isCropping && previewImage && (
                                <div className="d-flex justify-content-center">
                                    <ReactCrop
                                        crop={crop}
                                        onChange={handleCropChange}
                                        aspect={1}
                                    >
                                        <img
                                            ref={imageRef}
                                            src={previewImage}
                                            alt="Upload"
                                            style={{
                                                maxWidth: `${DISPLAY_DIMENSION}px`,
                                                maxHeight: `${DISPLAY_DIMENSION}px`,
                                                width: 'auto',
                                                height: 'auto'
                                            }}
                                            onLoad={onImageLoad}
                                        />
                                    </ReactCrop>
                                </div>
                            )}

                            {!isCropping && croppedImage && (
                                <div className="d-flex justify-content-center">
                                    <img
                                        src={croppedImage}
                                        alt="Cropped Preview"
                                        style={{
                                            maxWidth: `${DISPLAY_DIMENSION}px`,
                                            maxHeight: `${DISPLAY_DIMENSION}px`,
                                            width: 'auto',
                                            height: 'auto'
                                        }}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    {processingState.status === 'idle' && (
                        isCropping ? (
                            <button
                                className="btn btn-primary"
                                onClick={handleCropImage}
                                disabled={!previewImage || !imgLoaded}
                            >
                                Crop Image
                            </button>
                        ) : (
                            <button
                                className="btn btn-primary"
                                onClick={handleApplyStyle}
                            >
                                Apply Style
                            </button>
                        )
                    )}
                    {processingState.status === 'complete' && (
                        <button
                            className="btn btn-secondary"
                            onClick={handleCloseModal}
                        >
                            Close
                        </button>
                    )}
                </Modal.Footer>
            </Modal>
        </section>
    );
};

export default Models;