from .pix2pixHD_model import InferenceModel

def create_model(opt):
    model = InferenceModel()
    print(" inside of create_model")
    model.initialize(opt)
    return model
