import React, { useState } from 'react';
import Config from '../config';

const SimpleImageGenerator = () => {
    const [file, setFile] = useState(null);
    const [requestHash, setRequestHash] = useState(null);
    const [status, setStatus] = useState('idle');
    const [resultImage, setResultImage] = useState(null);
    const [error, setError] = useState(null);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const startGeneration = async () => {
        if (!file) return;

        try {
            setStatus('uploading');
            setError(null);

            const formData = new FormData();
            formData.append('image', file);
            formData.append('modelName', 'BlueShadeFace'); // Using a fixed model for testing

            const response = await fetch(`${Config.apiUrl}/image/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const data = await response.json();
            setRequestHash(data.requestHash);
            setStatus('processing');

            // Start polling
            pollForResult(data.requestHash);
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const pollForResult = async (hash) => {
        try {
            // Check status
            const statusResponse = await fetch(`${Config.apiUrl}/image/status/${hash}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                }
            });

            if (!statusResponse.ok) {
                throw new Error('Failed to check status');
            }

            const statusData = await statusResponse.json();

            if (statusData.status === 'completed') {
                // Fetch the result
                const imageResponse = await fetch(`${Config.apiUrl}/image/retrieve/${hash}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    }
                });

                if (!imageResponse.ok) {
                    throw new Error('Failed to retrieve image');
                }

                const blob = await imageResponse.blob();
                const imageUrl = URL.createObjectURL(blob);
                setResultImage(imageUrl);
                setStatus('complete');
            } else if (statusData.status === 'failed') {
                throw new Error('Processing failed');
            } else {
                // Continue polling
                setTimeout(() => pollForResult(hash), 3000);
            }
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const handleDownload = () => {
        if (resultImage) {
            const link = document.createElement('a');
            link.href = resultImage;
            link.download = 'generated-image.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto">
            <div className="space-y-4">
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="w-full p-2 border rounded"
                />

                <button
                    onClick={startGeneration}
                    disabled={!file || status === 'uploading' || status === 'processing'}
                    className="w-full p-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
                >
                    {status === 'uploading' ? 'Uploading...' :
                        status === 'processing' ? 'Processing...' :
                            'Generate Image'}
                </button>

                {error && (
                    <div className="p-2 text-red-500 border border-red-500 rounded">
                        {error}
                    </div>
                )}

                {resultImage && (
                    <div className="space-y-2">
                        <img src={resultImage} alt="Generated" className="w-full rounded" />
                        <button
                            onClick={handleDownload}
                            className="w-full p-2 bg-green-500 text-white rounded"
                        >
                            Download Image
                        </button>
                    </div>
                )}

                {status === 'processing' && (
                    <div className="text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-2">Processing your image...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimpleImageGenerator;