import sagemaker
from sagemaker.pytorch import PyTorchModel
from sagemaker.serverless import ServerlessInferenceConfig
import boto3

# Define the SageMaker execution role
role = 'arn:aws:iam::767397744917:role/service-role/AmazonSageMaker-ExecutionRole-20241020T190979'

# Specify the S3 path where the model artifacts are located
model_data = 's3://diffi2i-s2/diffi2i_s2_Model_971.pth.tar'

# Specify the image URI for PyTorch 1.13 with Python 3.9 in us-east-1
image_uri = '763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-inference:1.13-gpu-py39'

# Set up the SageMaker session
session = sagemaker.Session(boto_session=boto3.Session(region_name='us-east-1'))

# Explicitly set the default bucket using the correct method
default_bucket = 'diffi2i-s2'
session._default_bucket = default_bucket

# Create a PyTorch model with SageMaker support
pytorch_model = PyTorchModel(
    model_data=model_data,            # Location of your model artifacts in S3
    role=role,                        # The SageMaker execution role
    entry_point='inference.py',       # Your inference script
    image_uri=image_uri,              # Explicitly specify the image URI
    framework_version='1.13',         # Provide the framework version as a string
    sagemaker_session=session         # Set the custom SageMaker session
)

# Configure the serverless settings using ServerlessInferenceConfig
serverless_config = ServerlessInferenceConfig(
    memory_size_in_mb=4096,           # Memory size (can be up to 6144 MB)
    max_concurrency=10                # Maximum number of concurrent invocations
)

# Deploy the model as a serverless endpoint
predictor = pytorch_model.deploy(
    serverless_inference_config=serverless_config,
    endpoint_name='Diffi2i-S2-serverless'
)

print(f"Serverless endpoint {predictor.endpoint_name} created successfully!")
