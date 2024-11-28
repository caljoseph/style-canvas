import React, { useState, useRef } from 'react';
import { Modal } from 'react-bootstrap';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

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
    const [statusMessage, setStatusMessage] = useState({
        text: "Please upload an image of at least 1024x1024px",
        type: "info"
    });
    const imageRef = useRef(null);

    const MIN_DIMENSION = 1024;
    const DISPLAY_DIMENSION = 400;

    const models = [
        { name: "Abstract Face Line", image: "/assets/Face Sample/Abstract Face Line/BrennanMcCleary.png" },
        { name: "Blue Shade Face", image: "/assets/Face Sample/Blue Shade Face/BrennanMcCleary.png" },
        { name: "Chalk Drawing", image: "/assets/Face Sample/Chalk Drawing/BrennanMcCleary.png" },
        { name: "Crimson Canvas", image: "/assets/Face Sample/Crimson Canvas/Faces_Dataset_401.png" },
        { name: "Crimson Contour", image: "/assets/Face Sample/Crimson Contour/BrennanMcCleary.png" },
        { name: "Dark Color Blend", image: "/assets/Face Sample/Dark Color Blend/BrennanMcCleary.png" },
        { name: "Dot Line Face", image: "/assets/Face Sample/DotLineFace/BrennanMcCleary.png" },
        { name: "Harmony Hue", image: "/assets/Face Sample/HarmonyHue/BrennanMcCleary.png" },
        { name: "Kai Face", image: "/assets/Face Sample/Kai Face/image_117_image.png" },
        { name: "Line Sketch", image: "/assets/Face Sample/LineSketch/BrennanMcCleary.png" },
    ];

    const handleModelClick = (modelName) => {
        setSelectedModel(modelName);
        setShowModal(true);
        setError(null);
        setIsCropping(true);
        setPreviewImage(null);
        setCroppedImage(null);
        setOriginalDimensions({ width: 0, height: 0 });
        setStatusMessage({
            text: "Please upload an image of at least 1024x1024px",
            type: "info"
        });
    };

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

    const onImageLoad = (e) => {
        const { naturalWidth, naturalHeight, width, height } = e.currentTarget;
        setOriginalDimensions({ width: naturalWidth, height: naturalHeight });
        setImgLoaded(true);

        if (!validateImageDimensions(naturalWidth, naturalHeight)) {
            // Set maximum possible crop area even if image is too small
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

        // Set maximum possible crop area
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

    // Message style mapping
    const STATUS_STYLES = {
        error: {
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '8px 16px',
            borderRadius: '4px',
            marginBottom: '12px',
            width: '100%',
            textAlign: 'center'
        },
        success: {
            backgroundColor: '#dcfce7',
            color: '#16a34a',
            padding: '8px 16px',
            borderRadius: '4px',
            marginBottom: '12px',
            width: '100%',
            textAlign: 'center'
        },
        info: {
            backgroundColor: '#dbeafe',
            color: '#2563eb',
            padding: '8px 16px',
            borderRadius: '4px',
            marginBottom: '12px',
            width: '100%',
            textAlign: 'center'
        }
    };
    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Check file type
            const fileType = file.type;
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

            if (!validTypes.includes(fileType)) {
                setStatusMessage({
                    text: "Please upload a JPG, PNG, or WebP image",
                    type: "error"
                });
                return;
            }

            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(file);

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

    const handleCloseModal = () => {
        setShowModal(false);
        setPreviewImage(null);
        setCroppedImage(null);
        setSelectedModel('');
        setError(null);
        setIsCropping(true);
        setCrop(null);
        setImgLoaded(false);
        setOriginalDimensions({ width: 0, height: 0 });
        setStatusMessage({
            text: "Please upload an image of at least 1024x1024px",
            type: "info"
        });
    };

    const handleApplyStyle = () => {
        alert(`Styling image with ${selectedModel}. This feature will be implemented soon!`);
        handleCloseModal();
    };

    const handleCropChange = (newCrop) => {
        setCrop(newCrop);
        if (newCrop.width && newCrop.height) {
            validateCropDimensions(newCrop);
        }
    };

    const getStatusStyles = (type) => {
        switch (type) {
            case 'error':
                return 'font-medium text-red-600 bg-red-50 px-3 py-2 rounded';
            case 'success':
                return 'font-medium text-green-600 bg-green-50 px-3 py-2 rounded';
            case 'info':
            default:
                return 'font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded';
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
                        {!isCropping && (
                            <button
                                className="btn btn-secondary"
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
                        <Modal.Title className="modal-title">
                            Style: {selectedModel}
                        </Modal.Title>
                    </div>
                </Modal.Header>

                <Modal.Body>
                    {isCropping && (
                        <div className="mb-3">
                            <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {statusMessage.text && (
                                    <div style={STATUS_STYLES[statusMessage.type]}>
                                        {statusMessage.text}
                                    </div>
                                )}
                            </div>
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
                </Modal.Body>

                <Modal.Footer>
                    {isCropping ? (
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
                    )}
                </Modal.Footer>
            </Modal>
        </section>
    );
};

export default Models;