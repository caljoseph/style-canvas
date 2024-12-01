import React, { useState, useRef } from 'react';
import Config from '../config';
import { useAuth } from '../context/AuthContext';

const ModelTest = () => {
    const [testImage, setTestImage] = useState(null);
    const [modelResults, setModelResults] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const { user } = useAuth();
    const pollIntervals = useRef({});

    const models = [
        "Pencil Blur", "Verdant Flame", "Impasto", "Chalkboard", "Face-2-Paint",
        "Baroque Brush", "Upsample", "Van Gogh", "Red Mist", "Blue Mist",
        "Broken Glass", "Blue Shade", "Crimson Canvas", "Crimson Contour",
        "Dark Color Blend", "Dot Line", "Harmony Hue", "Kai", "Scarlet Frame",
        "Shadow Split", "Shadow Split Abstract", "Tenshi", "Tenshi Abstract",
        "Triad Shade", "Triadic Vision"
    ];

    const validateImage = (file) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                if (img.width < 1024 || img.height < 1024) {
                    reject(new Error(`Image too small: ${img.width}x${img.height}px. Minimum required: 1024x1024px`));
                }
                resolve(true);
            };
            img.onerror = () => reject(new Error('Invalid image file'));
            img.src = URL.createObjectURL(file);
        });
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            await validateImage(file);
            setTestImage(file);
            setModelResults({});
            setStatusMessage('Image loaded successfully. Ready to start testing.');
        } catch (error) {
            setStatusMessage(error.message);
            setTestImage(null);
        }
    };

    const pollStatus = async (requestHash, modelName) => {
        try {
            const response = await fetch(`${Config.apiUrl}/image/status/${requestHash}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                }
            });

            if (!response.ok) throw new Error('Failed to check status');

            const data = await response.json();

            if (data.status === 'completed') {
                // Clear polling first
                if (pollIntervals.current[modelName]) {
                    clearInterval(pollIntervals.current[modelName]);
                    delete pollIntervals.current[modelName];
                }

                const imageResponse = await fetch(`${Config.apiUrl}/image/retrieve/${requestHash}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    }
                });

                if (!imageResponse.ok) throw new Error('Failed to retrieve image');

                const blob = await imageResponse.blob();
                const imageUrl = URL.createObjectURL(blob);

                // Set final success state
                setModelResults(prev => ({
                    ...prev,
                    [modelName]: {
                        status: 'complete',
                        result: imageUrl
                    }
                }));

                // Don't continue with any more polling
                return;
            }
        } catch (error) {
            if (pollIntervals.current[modelName]) {
                clearInterval(pollIntervals.current[modelName]);
                delete pollIntervals.current[modelName];
            }
            setModelResults(prev => ({
                ...prev,
                [modelName]: {
                    status: 'error',
                    error: error.message
                }
            }));
        }
    };
    const processModel = async (modelName) => {
        try {
            const formData = new FormData();
            formData.append('image', testImage);
            formData.append('modelName', modelName);

            setModelResults(prev => ({
                ...prev,
                [modelName]: { status: 'processing' }
            }));

            const response = await fetch(`${Config.apiUrl}/image/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: formData
            });

            if (!response.ok) throw new Error('Failed to start processing');

            const data = await response.json();
            pollIntervals.current[modelName] = setInterval(() => pollStatus(data.requestHash, modelName), 3000);
        } catch (error) {
            setModelResults(prev => ({
                ...prev,
                [modelName]: {
                    status: 'error',
                    error: error.message
                }
            }));
        }
    };

    const startTesting = async () => {
        if (!testImage || !user) return;

        setIsProcessing(true);
        setStatusMessage('Starting batch processing...');

        for (const modelName of models) {
            await processModel(modelName);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'complete': return 'bg-success';
            case 'error': return 'bg-danger';
            case 'processing': return 'bg-primary';
            default: return 'bg-secondary';
        }
    };

    return (
        <div className="container py-4">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title mb-0">Model Batch Testing Dashboard</h2>
                </div>
                <div className="card-body">
                    <div className="mb-4">
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageUpload}
                            className="form-control"
                        />
                        {statusMessage && (
                            <div className="mt-2 text-muted small">
                                {statusMessage}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={startTesting}
                        disabled={!testImage || isProcessing}
                        className="btn btn-primary mb-4"
                    >
                        Start Batch Testing
                    </button>

                    <div className="row g-4">
                        {models.map((modelName) => (
                            <div key={modelName} className="col-12 col-md-6 col-lg-4">
                                <div className="card h-100">
                                    <div className="card-body">
                                        <h5 className="card-title mb-3">{modelName}</h5>
                                        {modelResults[modelName] ? (
                                            <div>
                                                <span className={`badge ${getStatusBadgeClass(modelResults[modelName].status)} mb-2`}>
                                                    {modelResults[modelName].status}
                                                </span>
                                                {modelResults[modelName].status === 'complete' && (
                                                    <img
                                                        src={modelResults[modelName].result}
                                                        alt={`${modelName} result`}
                                                        className="img-fluid rounded mt-2"
                                                        style={{ height: '160px', width: '100%', objectFit: 'cover' }}
                                                    />
                                                )}
                                                {modelResults[modelName].status === 'error' && (
                                                    <p className="text-danger small mt-2 mb-0">
                                                        {modelResults[modelName].error}
                                                    </p>
                                                )}
                                                {modelResults[modelName].status === 'processing' && (
                                                    <div className="mt-2">
                                                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                                                            <span className="visually-hidden">Processing...</span>
                                                        </div>
                                                        Processing...
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted small">Waiting to start...</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModelTest;