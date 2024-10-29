import torch
import numpy as np

def apply_mask(input_image_tensor, one_channel_mask):
    # Ensure input_image_tensor is a numpy array with correct shape (1024, 1024, 3)
    if isinstance(input_image_tensor, torch.Tensor):
        input_image_tensor = input_image_tensor.cpu().numpy()
        input_image_tensor = np.transpose(input_image_tensor, (1, 2, 0))  # CHW to HWC

    # Convert one_channel_mask to a 3-channel mask by repeating it across the channel dimension
    three_channel_mask = np.stack([one_channel_mask]*3, axis=-1)

    # Apply the mask: Set pixels to white (255, 255, 255) where mask is black (0)
    output_image = np.where(three_channel_mask == 0, [255, 255, 255], input_image_tensor)

    return output_image