import { HttpException, HttpStatus } from '@nestjs/common';

export const validateImage = (file: Express.Multer.File): boolean => {
    if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    // Check file type
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimeTypes.includes(file.mimetype)) {
        throw new HttpException(
            'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
            HttpStatus.BAD_REQUEST
        );
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        throw new HttpException(
            'File too large. Maximum size is 10MB',
            HttpStatus.BAD_REQUEST
        );
    }

    return true;
};