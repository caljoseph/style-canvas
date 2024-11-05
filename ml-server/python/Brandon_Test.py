import reuseablecustompythonfunctions as rcpf
from FaceImageProcessor import FaceImageProcessor
from DiffI2I_Inference import DiffI2IManager
from S2ModelConfigurations import S2ModelConfigurations
import io
import requests
from torchvision import transforms as T
import pickle
import torch
import torchvision.transforms as T


def FaceParsing_T2(img):
    """
    Preprocesses the image using FaceImageProcessor, sends it to the server for inference,
    and returns the result as a tensor.
    """
    print("Starting FaceParsing_T2 processing...")

    # Initialize and apply FaceImageProcessor to preprocess the image
    processor_images = FaceImageProcessor(512, 512)
    processed_image_tensor = processor_images.process_image(img)
    print(f"Processed image tensor shape: {processed_image_tensor.shape}")

    # Send the tensor to the inference server
    INFERENCE_API_URL = "http://localhost:8000/infer"
    buffer = io.BytesIO()
    torch.save(processed_image_tensor, buffer)
    buffer.seek(0)

    print(f"Sending tensor to server, buffer size: {len(buffer.getvalue())} bytes")

    try:
        # Send the preprocessed image tensor to the server
        response = requests.post(
            INFERENCE_API_URL,
            files={"file": ("image.pt", buffer, "application/octet-stream")},
            timeout=30  # Add timeout
        )
        print(f"Server response status code: {response.status_code}")

        if response.status_code != 200:
            print(f"Server error response: {response.text}")
            return None

        response.raise_for_status()

        # Deserialize the tensor from server response
        result_tensor = pickle.loads(response.content)
        print(f"Received result tensor shape: {result_tensor.shape}")
        return result_tensor

    except requests.exceptions.RequestException as e:
        print(f"Network error during inference: {str(e)}")
        return None
    except pickle.UnpicklingError as e:
        print(f"Error deserializing tensor: {str(e)}")
        return None
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return None