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

    const log = (modelName, message, data = null) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${modelName}] ${message}`, data || '');
    };

    const validateImage = (file) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                if (img.width < 1024 || img.height < 1024) {
                    reject(new Error(`Image too small: ${img.width}x${img.height}px. Minimum required: 1024x1024px`));
                } else {
                    resolve(true);
                }
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
        // First, check if we already have the image
        if (modelResults[modelName]?.status === 'complete') {
            log(modelName, 'Skipping poll - already complete', { requestHash });
            if (pollIntervals.current[modelName]) {
                log(modelName, 'Clearing poll interval - already complete');
                clearInterval(pollIntervals.current[modelName]);
                delete pollIntervals.current[modelName];
            }
            return;
        }

        log(modelName, 'Polling status', { requestHash });

        try {
            const response = await fetch(`${Config.apiUrl}/image/status/${requestHash}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                }
            });

            if (!response.ok) throw new Error('Failed to check status');

            const data = await response.json();
            log(modelName, 'Status response received', data);

            if (data.status === 'completed') {
                // Double check we haven't already gotten this image
                if (modelResults[modelName]?.status === 'complete') {
                    log(modelName, 'Image already retrieved while waiting for status - skipping retrieval');
                    return;
                }

                log(modelName, 'Status complete, retrieving image', { requestHash });

                try {
                    const imageResponse = await fetch(`${Config.apiUrl}/image/retrieve/${requestHash}`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                        }
                    });

                    if (!imageResponse.ok) throw new Error('Failed to retrieve image');

                    const blob = await imageResponse.blob();
                    const imageUrl = URL.createObjectURL(blob);

                    log(modelName, 'Image retrieved successfully', { requestHash });

                    setModelResults(prev => {
                        // One final check before updating state
                        if (prev[modelName]?.status === 'complete') {
                            log(modelName, 'State was already complete while retrieving - discarding update');
                            URL.revokeObjectURL(imageUrl);
                            return prev;
                        }

                        log(modelName, 'Updating state with completed image');
                        return {
                            ...prev,
                            [modelName]: {
                                status: 'complete',
                                result: imageUrl,
                                requestHash
                            }
                        };
                    });

                    // Clear the interval immediately after success
                    if (pollIntervals.current[modelName]) {
                        log(modelName, 'Clearing poll interval after successful retrieval');
                        clearInterval(pollIntervals.current[modelName]);
                        delete pollIntervals.current[modelName];
                    }
                } catch (error) {
                    log(modelName, 'Error retrieving image', error);
                    if (modelResults[modelName]?.status !== 'complete') {
                        setModelResults(prev => ({
                            ...prev,
                            [modelName]: {
                                status: 'error',
                                error: error.message
                            }
                        }));
                    }
                }
            } else if (data.status === 'failed') {
                log(modelName, 'Processing failed');
                if (pollIntervals.current[modelName]) {
                    clearInterval(pollIntervals.current[modelName]);
                    delete pollIntervals.current[modelName];
                }
                setModelResults(prev => ({
                    ...prev,
                    [modelName]: {
                        status: 'error',
                        error: 'Processing failed'
                    }
                }));
            }
        } catch (error) {
            log(modelName, 'Error polling status', error);
            if (modelResults[modelName]?.status !== 'complete') {
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
        }
    };

    const processModel = async (modelName) => {
        log(modelName, 'Starting processing');

        if (modelResults[modelName]?.status === 'complete') {
            log(modelName, 'Skipping - already complete');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('image', testImage);
            formData.append('modelName', modelName);

            log(modelName, 'Setting processing status');
            setModelResults(prev => ({
                ...prev,
                [modelName]: { status: 'processing' }
            }));

            log(modelName, 'Sending generate request');
            const response = await fetch(`${Config.apiUrl}/image/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: formData
            });

            if (!response.ok) throw new Error('Failed to start processing');

            const data = await response.json();
            log(modelName, 'Generate response received', data);

            // Only start polling if we don't already have a result
            if (modelResults[modelName]?.status !== 'complete') {
                if (pollIntervals.current[modelName]) {
                    log(modelName, 'Clearing existing poll interval');
                    clearInterval(pollIntervals.current[modelName]);
                    delete pollIntervals.current[modelName];
                }

                log(modelName, 'Starting polling interval');
                pollIntervals.current[modelName] = setInterval(() => pollStatus(data.requestHash, modelName), 3000);
            } else {
                log(modelName, 'Skipping polling - result already received');
            }
        } catch (error) {
            log(modelName, 'Error in processModel', error);
            if (modelResults[modelName]?.status !== 'complete') {
                setModelResults(prev => ({
                    ...prev,
                    [modelName]: {
                        status: 'error',
                        error: error.message
                    }
                }));
            }
        }
    };

    const startTesting = async () => {
        if (!testImage || !user) return;

        setIsProcessing(true);
        setStatusMessage('Starting batch processing...');
        console.log('[BatchStart] Beginning batch processing of all models');

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

    // Cleanup function
    React.useEffect(() => {
        return () => {
            console.log('[Cleanup] Component unmounting - cleaning up resources');
            // Clear all polling intervals
            Object.entries(pollIntervals.current).forEach(([modelName, interval]) => {
                console.log(`[Cleanup] Clearing interval for ${modelName}`);
                clearInterval(interval);
            });

            // Revoke all object URLs
            Object.entries(modelResults).forEach(([modelName, result]) => {
                if (result.status === 'complete' && result.result) {
                    console.log(`[Cleanup] Revoking URL for ${modelName}`);
                    URL.revokeObjectURL(result.result);
                }
            });
        };
    }, []);

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