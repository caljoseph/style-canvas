import re
import yaml

def clean_file(input_file, output_file):
    """Clean the input file by removing non-printable characters."""
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        # Try reading the file with a different encoding if UTF-8 fails
        with open(input_file, 'r', encoding='latin-1') as f:
            content = f.read()

    # Remove non-printable characters, like #x0000
    cleaned_content = re.sub(r'[^\x20-\x7E\n\r\t]', '', content)

    # Write cleaned content to a new file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(cleaned_content)
    
    print(f"Cleaned file saved as '{output_file}'")

def remove_windows_specific_packages(cleaned_file, output_file="environment_docker.yml"):
    # List of Windows-specific packages to remove
    windows_specific_packages = [
        "vs2015_runtime", "vc14_runtime", "pthreads-win32", "ucrt", "vc",
        "libzlib-wapi", "libzlib", "libxml2", "libsqlite", "libpng", 
        "liblapack", "libjpeg-turbo", "libiconv", "libhwloc", "libffi", 
        "libcblas", "libblas", "intel-openmp", "mkl", "dlib", "xz", 
        "openssl", "cudnn", "cudatoolkit", "ca-certificates", "tk", "tbb", 
        "python"
    ]
    
    try:
        # Load the cleaned environment.yml file
        with open(cleaned_file, 'r', encoding='utf-8') as file:
            env_data = yaml.safe_load(file)
        
        # Filter out Windows-specific packages
        if 'dependencies' in env_data:
            new_dependencies = []
            for dep in env_data['dependencies']:
                if isinstance(dep, str):
                    package_name = dep.split("=")[0]
                    if package_name not in windows_specific_packages:
                        new_dependencies.append(dep)
                elif isinstance(dep, dict) and 'pip' in dep:
                    new_dependencies.append(dep)  # Keep pip dependencies unchanged

            env_data['dependencies'] = new_dependencies
        
        # Save the modified environment.yml to a new file
        with open(output_file, 'w', encoding='utf-8') as file:
            yaml.safe_dump(env_data, file)
        
        print(f"New Docker-compatible environment file saved as '{output_file}'")
    
    except yaml.YAMLError as exc:
        print(f"Error while parsing the YAML file: {exc}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    # Use the correct path to the environment.yml file
    environment_file_path = "G:/My Drive/All_Deep_Learning_Models/AI_Model_Example/StyleCanvasAI/environment.yml"
    cleaned_file_path = "G:/My Drive/All_Deep_Learning_Models/AI_Model_Example/StyleCanvasAI/cleaned_environment.yml"
    
    # Step 1: Clean the file by removing non-printable characters
    clean_file(environment_file_path, cleaned_file_path)
    
    # Step 2: Process the cleaned file to remove Windows-specific packages
    remove_windows_specific_packages(cleaned_file_path)
