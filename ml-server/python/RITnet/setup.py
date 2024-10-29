from setuptools import setup, find_packages

setup(
    name='RITnet',
    version='0.1',
    packages=find_packages(),
    install_requires=[
        'torch',
        'torchsummary',
        'tqdm',
        'matplotlib',
        'numpy',
        'scikit-learn',
        'opencv-python',
        # Add any other dependencies here
    ],
    author='Brandon Boone',
    author_email='bboone900@gmail.com',
    description='RITnet: A deep learning project for eye segmentation',
    url='https://github.com/AayushKrChaudhary/RITnet',  # Update this if needed
)
