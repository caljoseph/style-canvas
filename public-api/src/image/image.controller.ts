import { Controller } from '@nestjs/common';

@Controller('image')
export class ImageController {}

// I think in image controller there will be the endpoint to generate image, it will take the user's info
// Validate it and make sure they have enough tokens
// it will take the model that they specified as well as the image
// it will then talk to the other server (main call) and receive an image
// on successful receipt it will decrement the tokens and return the image back to the caller.
