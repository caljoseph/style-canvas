import { Controller, Logger, Post, Body, UploadedFile, UseInterceptors, BadRequestException, HttpStatus, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

enum ModelName {
    ShadowSplit_Abstract = 'ShadowSplit_Abstract',
    ShadowSplit = 'ShadowSplit',
    Kai_Face = 'Kai_Face',
    TriadShade = 'TriadShade',
    HarmonyHue = 'HarmonyHue',
    TriadicVision = 'TriadicVision',
    BlueShadeFace = 'BlueShadeFace',
    CrimsonCanvas = 'CrimsonCanvas',
    CrimsonContour = 'CrimsonContour',
    DarkColorBlend = 'DarkColorBlend',
    DotLineFace = 'DotLineFace',
    Tenshi = 'Tenshi',
    TenshiAbstract = 'TenshiAbstract',
    ScarletFrame = 'ScarletFrame',
    RedMist = 'RedMist',
    Impasto_L1 = 'Impasto_L1',
    Impasto = 'Impasto',
    VanGogh = 'VanGogh',
    BlueMist = 'BlueMist',
    Chalkboard = 'Chalkboard',
    OilPainting_SC3 = 'OilPainting_SC3',
    OilPainting_OP3 = 'OilPainting_OP3',
    pencil_blur = 'pencil_blur',
    Verdant_Flame = 'Verdant_Flame',
    face2paint = 'face2paint',
    crop_and_resize_face_image = 'crop_and_resize_face_image',
    apply_broken_glass_effect = 'apply_broken_glass_effect',
    Upsample = 'Upsample'
}

class GenerateImageDto {
    modelName: ModelName;
}

@Controller('generate')
export class GenerateController {
    private readonly logger = new Logger(GenerateController.name);

    @Post('/image')
    @UseInterceptors(FileInterceptor('image'))
    async generateImage(
        @UploadedFile() file: Express.Multer.File,
        @Body() generateImageDto: GenerateImageDto,
        @Res() res: Response
    ) {
        if (!file) {
            throw new BadRequestException('No image file uploaded');
        }

        if (!Object.values(ModelName).includes(generateImageDto.modelName)) {
            throw new BadRequestException('Invalid model name');
        }

        const projectRoot = '/home/ubuntu/style-canvas/ml-server';
        const pythonDir = path.join(projectRoot, 'python');
        const tempDir = path.join(projectRoot, 'temp');
        const inputFilePath = path.join(tempDir, 'input_image.png');
        const outputFilePath = path.join(tempDir, 'output_image.png');

        try {
            // Create temp directory
            this.logger.log('Creating temporary directory');
            await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
            await fs.promises.mkdir(tempDir, { recursive: true });

            // Save the uploaded file
            this.logger.log(`Saving uploaded file to ${inputFilePath}`);
            await fs.promises.writeFile(inputFilePath, file.buffer);

            // Execute the Python script
            const pythonScriptPath = 'StyleCanvasAI.py';

            // Construct and log the shell command
            const shellCommand = `cd ${pythonDir} && conda run -n Pix2PixTester python ${pythonScriptPath} --input_file ${inputFilePath} --output_file ${outputFilePath} --filter_name ${generateImageDto.modelName}`;
            this.logger.log(`Executing shell command: ${shellCommand}`);

            const { stdout, stderr } = await this.executePythonScript(pythonDir, pythonScriptPath, [
                '--input_file', inputFilePath,
                '--output_file', outputFilePath,
                '--filter_name', generateImageDto.modelName,
            ]);

            if (stderr) {
                this.logger.warn(`Python script warning: ${stderr}`);
            }

            this.logger.log(`Python script output: ${stdout}`);

            // Check if the output file exists
            if (!(await fs.promises.stat(outputFilePath).then(() => true).catch(() => false))) {
                throw new Error(`Output file not found: ${outputFilePath}`);
            }

            this.logger.log(`Reading generated image from ${outputFilePath}`);
            const generatedImage = await fs.promises.readFile(outputFilePath);

            // Send the generated image as response
            this.logger.log('Sending generated image as response');
            res.status(HttpStatus.CREATED)
                .contentType('image/png')
                .send(generatedImage);

        } catch (error) {
            this.logger.error(`Error generating image: ${error.message}`);
            throw new BadRequestException('Image generation failed');
        } finally {
            // Clean up the temp directory
            this.logger.log(`Cleaning up temporary directory: ${tempDir}`);
            await fs.promises.rm(tempDir, { recursive: true, force: true }).catch((error) => {
                this.logger.warn(`Failed to clean up temp directory: ${error.message}`);
            });
        }
    }

    private executePythonScript(cwd: string, scriptPath: string, args: string[]): Promise<{ stdout: string, stderr: string }> {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn('conda', ['run', '-n', 'Pix2PixTester', 'python', scriptPath, ...args], {
                env: { ...process.env, PYTHONUNBUFFERED: '1' },
                cwd: cwd
            });

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
                this.logger.log(`Python stdout: ${data}`);
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
                this.logger.error(`Python stderr: ${data}`);
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Python script exited with code ${code}`));
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }
}