import torch
import networks as Networks
import torch.optim as optim
import reuseablecustompythonfunctions as rcpf
from torchvision import transforms as T
from PIL import Image
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
from InferenceImageProcessor import InferenceImageProcessor
img_height=1024
img_width=1024

LOAD_CHECKPOINT_GEN = r"./ModelWeights/Gen_Chalk_Photo_Effect_128.pth.tar"
is_chalkboard_model = False
generator_model = None

def load_checkpoint(checkpoint_path, model, optimizer=None, lr=None, map_location='cpu'):
    checkpoint = torch.load(checkpoint_path, map_location=map_location)

    from collections import OrderedDict
    new_state_dict = OrderedDict()

    for k, v in checkpoint['state_dict'].items():
        name = k[7:] if k.startswith('module.') else 'module.' + k  # strip or add 'module.' prefix
        new_state_dict[name] = v

    model.load_state_dict(new_state_dict)

    if optimizer is not None:
        optimizer.load_state_dict(checkpoint['optimizer'])

    # If learning rate is provided, set it
    if lr is not None and optimizer is not None:
        for param_group in optimizer.param_groups:
            param_group['lr'] = lr

    print("Checkpoint loaded successfully")

def apply_filter_to_image(img, generator_model):
    generator_model.eval()
    with torch.no_grad():
            img = img.to(DEVICE)
            generated_image = generator_model(img)
    return generated_image

def get_chalkboard_model():
    num_gpus = torch.cuda.device_count()
    gpu_ids = list(range(num_gpus))
    ngf = 128
    generator_input_nc = 3
    generator_output_nc = 3
    generator_model = Networks.define_G(generator_input_nc, generator_output_nc, ngf, 'global', gpu_ids=gpu_ids)
    LEARNING_RATE = 2e-4
    
    generator_model = generator_model.to(DEVICE)
    generator_model = rcpf.setup_gpus_for_training(generator_model)
    generator_optimizer = optim.Adam(generator_model.parameters(), lr = LEARNING_RATE , betas = (0.5, 0.999))
    map_location = 'cuda' if torch.cuda.is_available() else 'cpu'
    load_checkpoint(LOAD_CHECKPOINT_GEN, generator_model, generator_optimizer, LEARNING_RATE, map_location=map_location)
    
    return generator_model

def apply_chalkboard_Filter(img):
    global generator_model, is_chalkboard_model
    if not is_chalkboard_model:
        generator_model = get_chalkboard_model()
        is_chalkboard_model = True

    processor_images = InferenceImageProcessor(img_height, img_width)
    processed_image = processor_images.process_image(img)
    return rcpf.tensor2im(apply_filter_to_image(processed_image, generator_model), normalize=False)
    

    
    