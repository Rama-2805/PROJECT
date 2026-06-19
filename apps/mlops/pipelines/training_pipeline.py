# ─── SmartCampus AI — MLOps Training Pipeline ──────────────────
# Orchestrates AI model training jobs: data loading, augmentation,
# distributed training, checkpointing, and artifact logging.
#
# Usage:
#   python training_pipeline.py --config ../training/pipeline_config.yaml
#   python training_pipeline.py --experiment-id EXP-20250601-001
#
# Config: ../training/pipeline_config.yaml

import argparse
import json
import logging
import os
import sys
import time
import yaml
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional

# Resolve config paths relative to this script
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("training_pipeline")


# ── Enums & Data Classes ─────────────────────────────────────────

class ModelType(str, Enum):
    FACE_RECOGNITION = "face_recognition"
    BEHAVIOR = "behavior"
    POSE = "pose"


class TrainingStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


@dataclass
class TrainingConfig:
    model_type: ModelType
    experiment_id: str
    model_id: Optional[str]
    dataset_id: str
    dataset_version: str
    epochs: int = 50
    batch_size: int = 64
    learning_rate: float = 0.001
    optimizer: str = "adamw"
    weight_decay: float = 0.01
    mixed_precision: bool = True
    gpu_required: bool = True
    distributed: bool = False
    output_dir: str = "/data/models"
    checkpoint_interval: int = 5
    augmentations: list[str] = field(default_factory=list)
    early_stopping_patience: int = 10
    early_stopping_min_delta: float = 0.001


# ── Configuration Loader ─────────────────────────────────────────

def load_pipeline_config(config_path: str) -> dict:
    """Load the training pipeline configuration from YAML."""
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def build_training_config(
    pipeline_config: dict,
    experiment_config: dict,
) -> TrainingConfig:
    """Merge pipeline defaults with experiment-specific overrides."""
    model_cfg = pipeline_config.get("models", {}).get(
        experiment_config.get("model_type", "face_recognition"), {}
    )
    return TrainingConfig(
        model_type=ModelType(experiment_config.get("model_type", "face_recognition")),
        experiment_id=experiment_config["experiment_id"],
        model_id=experiment_config.get("model_id"),
        dataset_id=experiment_config["dataset_id"],
        dataset_version=experiment_config.get("dataset_version", "1.0.0"),
        epochs=experiment_config.get("epochs", model_cfg.get("default_epochs", 50)),
        batch_size=experiment_config.get("batch_size", model_cfg.get("default_batch_size", 64)),
        learning_rate=experiment_config.get("learning_rate", model_cfg.get("learning_rate", {}).get("initial", 0.001)),
        optimizer=experiment_config.get("optimizer", model_cfg.get("optimizer", "adamw")),
        weight_decay=experiment_config.get("weight_decay", model_cfg.get("weight_decay", 0.01)),
        mixed_precision=experiment_config.get("mixed_precision", model_cfg.get("mixed_precision", True)),
        gpu_required=experiment_config.get("gpu_required", model_cfg.get("gpu_required", True)),
        distributed=experiment_config.get("distributed", False),
        augmentations=model_cfg.get("augmentations", []),
        early_stopping_patience=pipeline_config.get("early_stopping", {}).get("patience", 10),
        early_stopping_min_delta=pipeline_config.get("early_stopping", {}).get("min_delta", 0.001),
    )


# ── Pipeline Stages ──────────────────────────────────────────────

class DataLoader:
    """Stage 1: Load and prepare dataset for training."""

    def __init__(self, config: TrainingConfig):
        self.config = config
        self.logger = logging.getLogger("training_pipeline.data")

    def validate_dataset(self) -> bool:
        """Verify dataset integrity and availability."""
        self.logger.info(
            "Validating dataset %s (v%s) for %s",
            self.config.dataset_id,
            self.config.dataset_version,
            self.config.model_type.value,
        )
        # TODO: Implement actual dataset validation against the backend API
        return True

    def prepare_augmentations(self) -> list[str]:
        """Build augmentation pipeline based on model type."""
        self.logger.info("Preparing augmentations: %s", self.config.augmentations)
        return self.config.augmentations

    def create_data_loaders(self):
        """Create train/validation data loaders."""
        self.logger.info(
            "Creating data loaders: batch_size=%d, workers=4",
            self.config.batch_size,
        )
        # TODO: Implement PyTorch DataLoader creation
        return {"train": None, "val": None}


class ModelTrainer:
    """Stage 2: Execute model training with monitoring."""

    def __init__(self, config: TrainingConfig):
        self.config = config
        self.status = TrainingStatus.QUEUED
        self.current_epoch = 0
        self.current_loss = float("inf")
        self.current_accuracy = 0.0
        self.best_accuracy = 0.0
        self.epochs_no_improve = 0
        self.loss_history: list[float] = []
        self.accuracy_history: list[float] = []
        self.logger = logging.getLogger("training_pipeline.train")

    def check_resources(self) -> bool:
        """Verify GPU availability if required."""
        if self.config.gpu_required:
            try:
                import torch
                if not torch.cuda.is_available():
                    self.logger.warning("GPU required but not available")
                    return False
                gpu_count = torch.cuda.device_count()
                self.logger.info("Found %d GPU(s) available", gpu_count)
            except ImportError:
                self.logger.warning("PyTorch not installed — simulating training")
        return True

    def build_model(self):
        """Initialize model architecture based on model type."""
        self.logger.info(
            "Building %s model for experiment %s",
            self.config.model_type.value,
            self.config.experiment_id,
        )
        if self.config.model_type == ModelType.FACE_RECOGNITION:
            self.logger.info("Initializing ArcFace with ResNet-50 backbone")
        elif self.config.model_type == ModelType.BEHAVIOR:
            self.logger.info("Initializing YOLOv8n behavior detector")
        elif self.config.model_type == ModelType.POSE:
            self.logger.info("Initializing MobileNetV3 pose classifier")
        # TODO: Implement actual model building

    def train_epoch(self, epoch: int) -> dict[str, float]:
        """Execute one training epoch."""
        self.logger.info("Epoch %d/%d — training", epoch + 1, self.config.epochs)
        # TODO: Implement actual training step
        simulated_loss = max(0.01, self.current_loss * 0.85 + 0.01)
        simulated_accuracy = min(100.0, self.current_accuracy + 1.5 + (0.5 if epoch > 10 else 3.0))
        return {"loss": simulated_loss, "accuracy": simulated_accuracy}

    def validate(self, epoch: int) -> dict[str, float]:
        """Run validation after training epoch."""
        self.logger.info("Epoch %d/%d — validation", epoch + 1, self.config.epochs)
        val_accuracy = self.current_accuracy * 0.97
        val_loss = self.current_loss * 1.08
        return {"loss": val_loss, "accuracy": val_accuracy}

    def save_checkpoint(self, epoch: int, is_best: bool = False):
        """Save model checkpoint."""
        checkpoint_path = os.path.join(
            self.config.output_dir,
            f"{self.config.experiment_id}_epoch_{epoch + 1}.pt",
        )
        if is_best:
            best_path = os.path.join(
                self.config.output_dir,
                f"{self.config.experiment_id}_best.pt",
            )
            self.logger.info("Saving best model to %s", best_path)
        self.logger.info("Checkpoint saved: %s", checkpoint_path)
        # TODO: Implement actual checkpoint serialization

    def run(self) -> dict[str, Any]:
        """Execute the full training pipeline."""
        self.status = TrainingStatus.RUNNING
        start_time = time.time()

        if not self.check_resources():
            self.status = TrainingStatus.FAILED
            return {"status": "FAILED", "error": "Insufficient resources"}

        self.build_model()

        for epoch in range(self.config.epochs):
            self.current_epoch = epoch

            # Training step
            train_metrics = self.train_epoch(epoch)
            self.current_loss = train_metrics["loss"]
            self.current_accuracy = train_metrics["accuracy"]
            self.loss_history.append(self.current_loss)
            self.accuracy_history.append(self.current_accuracy)

            # Validation step
            val_metrics = self.validate(epoch)
            val_accuracy = val_metrics["accuracy"]

            # Early stopping check
            if val_accuracy > self.best_accuracy:
                self.best_accuracy = val_accuracy
                self.epochs_no_improve = 0
                self.save_checkpoint(epoch, is_best=True)
            else:
                self.epochs_no_improve += 1
                if self.epochs_no_improve >= self.config.early_stopping_patience:
                    self.logger.info(
                        "Early stopping triggered after %d epochs without improvement",
                        self.config.early_stopping_patience,
                    )
                    break

            # Regular checkpoint
            if (epoch + 1) % self.config.checkpoint_interval == 0:
                self.save_checkpoint(epoch)

            self.logger.info(
                "Epoch %d/%d — loss: %.4f, acc: %.2f%%, val_acc: %.2f%%",
                epoch + 1, self.config.epochs,
                self.current_loss, self.current_accuracy, val_accuracy,
            )

        training_time = time.time() - start_time
        self.status = TrainingStatus.COMPLETED

        return {
            "status": "COMPLETED",
            "experiment_id": self.config.experiment_id,
            "training_time_seconds": training_time,
            "epochs_completed": self.current_epoch + 1,
            "best_accuracy": self.best_accuracy,
            "final_loss": self.current_loss,
            "loss_history": self.loss_history,
            "accuracy_history": self.accuracy_history,
        }


# ── Artifact Logger ──────────────────────────────────────────────

class ArtifactLogger:
    """Stage 3: Log training artifacts and metrics to backend API."""

    def __init__(self, backend_url: str = "http://localhost:4000"):
        self.backend_url = backend_url
        self.logger = logging.getLogger("training_pipeline.artifacts")

    def log_experiment_results(self, results: dict[str, Any]):
        """Send training results to the MLOps API."""
        self.logger.info(
            "Logging results for experiment %s",
            results.get("experiment_id"),
        )
        # TODO: POST to /api/mlops/experiments/{id}/results
        payload = {
            "status": results["status"],
            "trainingTime": results["training_time_seconds"],
            "trainingAccuracy": results["best_accuracy"],
            "lossCurve": results["loss_history"],
            "metrics": {
                "finalLoss": results["final_loss"],
                "epochsCompleted": results["epochs_completed"],
            },
        }
        self.logger.info("Artifact payload: %s", json.dumps(payload, indent=2))
        return payload

    def save_model_artifact(self, model_path: str, metadata: dict):
        """Register trained model in the model registry."""
        self.logger.info("Registering model artifact: %s", model_path)
        # TODO: Upload model to MinIO and register via API
        pass


# ── Main Pipeline Runner ─────────────────────────────────────────

class TrainingPipeline:
    """Orchestrates the complete training pipeline."""

    def __init__(self, config_path: str):
        self.config_path = config_path
        self.pipeline_config = load_pipeline_config(config_path)
        self.logger = logging.getLogger("training_pipeline.pipeline")

    def run(self, experiment_config: dict) -> dict[str, Any]:
        """Execute the full training pipeline for an experiment."""
        self.logger.info("=" * 60)
        self.logger.info("Starting training pipeline for experiment: %s", experiment_config.get("experiment_id"))
        self.logger.info("=" * 60)

        # Stage 1: Build config
        config = build_training_config(self.pipeline_config, experiment_config)
        self.logger.info("Config: epochs=%d, batch_size=%d, lr=%.6f", config.epochs, config.batch_size, config.learning_rate)

        # Stage 2: Data loading
        data_loader = DataLoader(config)
        if not data_loader.validate_dataset():
            return {"status": "FAILED", "error": "Dataset validation failed"}
        data_loader.prepare_augmentations()

        # Stage 3: Model training
        trainer = ModelTrainer(config)
        results = trainer.run()

        # Stage 4: Log artifacts
        artifact_logger = ArtifactLogger()
        artifact_logger.log_experiment_results(results)

        self.logger.info("=" * 60)
        self.logger.info("Pipeline completed: %s", results["status"])
        self.logger.info("=" * 60)

        return results


# ── CLI Entry Point ──────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(description="SmartCampus AI Training Pipeline")
    parser.add_argument(
        "--config",
        default=os.path.join(_SCRIPT_DIR, "..", "training", "pipeline_config.yaml"),
        help="Path to pipeline config YAML",
    )
    parser.add_argument("--experiment-id", help="Experiment ID to train")
    parser.add_argument("--model-type", choices=["face_recognition", "behavior", "pose"])
    parser.add_argument("--dataset-id", help="Dataset ID for training")
    parser.add_argument("--epochs", type=int, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, help="Batch size")
    parser.add_argument("--learning-rate", type=float, help="Learning rate")
    parser.add_argument("--dry-run", action="store_true", help="Validate config without training")
    return parser.parse_args()


def main():
    args = parse_args()

    # Build experiment config from CLI args or env
    experiment_config = {
        "experiment_id": args.experiment_id or os.getenv("EXPERIMENT_ID", f"EXP-{datetime.now().strftime('%Y%m%d-%H%M%S')}"),
        "model_type": args.model_type or os.getenv("MODEL_TYPE", "face_recognition"),
        "dataset_id": args.dataset_id or os.getenv("DATASET_ID", "ds-1"),
        "dataset_version": os.getenv("DATASET_VERSION", "1.0.0"),
        "epochs": args.epochs or int(os.getenv("EPOCHS", "50")),
        "batch_size": args.batch_size or int(os.getenv("BATCH_SIZE", "64")),
        "learning_rate": args.learning_rate or float(os.getenv("LEARNING_RATE", "0.001")),
    }

    pipeline = TrainingPipeline(args.config)

    if args.dry_run:
        config = build_training_config(
            pipeline.pipeline_config,
            experiment_config,
        )
        logger.info("Dry-run validation passed for config: %s", config)
        return

    results = pipeline.run(experiment_config)
    logger.info("Final results: %s", json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    main()
