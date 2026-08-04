import sys
from scripts.run_pipeline import run_pipeline

def main():
    config_path = "config/config.yaml"
    input_dir = "footage"
    device = "auto"
    run_pipeline(config_path, input_dir, device)

if __name__ == "__main__":
    main()
