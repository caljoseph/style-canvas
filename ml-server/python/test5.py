import os

# Replace 'your_env_name' with the name of your Anaconda environment
env_name = 'Pix2PixTester'

# Get the path to the Anaconda environment directory
conda_envs_path = os.path.join(os.environ['CONDA_PREFIX'])

# Check if the environment path exists
if not os.path.exists(conda_envs_path):
    print(f"The environment path {conda_envs_path} does not exist.")
else:
    print(f"Environment path found: {conda_envs_path}")

    # List all files in the environment
    for root, dirs, files in os.walk(conda_envs_path):
        for file in files:
            print(os.path.join(root, file))
