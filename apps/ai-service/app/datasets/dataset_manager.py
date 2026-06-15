"""SmartCampus AI — MLOps Dataset Manager.

Handles dataset loading, splitting, validation, augmentation,
versioning, and synthetic data generation.
"""

import os
import json
import uuid
import random
import time
import hashlib
from typing import Optional
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class DatasetMetadata:
    """Metadata for a managed dataset."""
    name: str
    description: str
    dataset_type: str  # FACE, BEHAVIOR, CLASSROOM_ACTIVITY, SYNTHETIC
    version: str
    total_samples: int
    num_classes: int
    splits: dict = field(default_factory=lambda: {"train": 0.8, "val": 0.1, "test": 0.1})
    source: str = "UPLOADED"
    quality_score: float = 0.0
    checksum: str = ""
    created_by: str = "mlops-pipeline"
    created_at: float = 0.0


class DatasetManager:
    """Manages dataset lifecycle: validation, splitting, versioning."""

    def __init__(self, base_path: str = "/data/datasets"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def validate_dataset(self, dataset_path: str) -> dict:
        """Validate dataset structure and file integrity.

        Args:
            dataset_path: Path to dataset directory.

        Returns:
            Validation results dict.
        """
        print(f"[DatasetManager] Validating: {dataset_path}")

        # Check directory exists
        path = Path(dataset_path)
        if not path.exists():
            return {"valid": False, "errors": ["Dataset path does not exist"]}

        # Count files
        image_files = list(path.glob("**/*.jpg")) + list(path.glob("**/*.png"))
        total_files = len(image_files)

        # Check class structure
        class_dirs = [d for d in path.iterdir() if d.is_dir()]
        class_count = len(class_dirs)

        # Calculate quality score based on structure
        quality = 0.0
        issues = []

        if total_files < 100:
            issues.append(f"Low sample count: {total_files}")
            quality = 0.3
        elif total_files < 1000:
            quality = 0.6
        else:
            quality = 0.9

        if class_count < 2:
            issues.append(f"Few classes: {class_count}")
            quality *= 0.5

        # Compute checksum
        checksums = []
        for f in list(image_files)[:100]:  # Sample first 100 files
            checksums.append(self._compute_checksum(str(f)))
        dataset_checksum = hashlib.sha256("".join(checksums).encode()).hexdigest()

        result = {
            "valid": len(issues) == 0,
            "total_files": total_files,
            "class_count": class_count,
            "quality_score": round(quality, 2),
            "checksum": dataset_checksum,
            "issues": issues,
            "class_names": [d.name for d in class_dirs],
        }

        print(f"  Files: {total_files} | Classes: {class_count} | Quality: {quality:.2%}")
        if issues:
            print(f"  Issues: {'; '.join(issues)}")

        return result

    def split_dataset(self, dataset_path: str, splits: dict = None) -> dict:
        """Split dataset into train/val/test sets.

        Args:
            dataset_path: Path to dataset directory.
            splits: Split ratios (default: 80/10/10).

        Returns:
            Split configuration.
        """
        if splits is None:
            splits = {"train": 0.8, "val": 0.1, "test": 0.1}

        print(f"[DatasetManager] Splitting dataset with ratios: {splits}")
        time.sleep(0.3)

        # Simulate split
        total = 10000
        train_count = int(total * splits["train"])
        val_count = int(total * splits["val"])
        test_count = total - train_count - val_count

        split_info = {
            "dataset_path": dataset_path,
            "splits": splits,
            "train_samples": train_count,
            "val_samples": val_count,
            "test_samples": test_count,
            "total": total,
            "status": "SPLIT_COMPLETED",
        }

        print(f"  Train: {train_count} | Val: {val_count} | Test: {test_count}")
        return split_info

    def create_version(self, name: str, version: str, source_path: str,
                       description: str = "") -> DatasetMetadata:
        """Create a new dataset version with metadata.

        Args:
            name: Dataset name.
            version: Semantic version string (e.g., "2.0.0").
            source_path: Source dataset path.
            description: Dataset description.

        Returns:
            DatasetMetadata for the new version.
        """
        print(f"[DatasetManager] Creating version {version} of '{name}'")

        # Validate source
        validation = self.validate_dataset(source_path)
        if not validation["valid"] and validation["quality_score"] < 0.5:
            print(f"  Warning: Low quality dataset ({validation['quality_score']:.2%})")

        metadata = DatasetMetadata(
            name=name,
            description=description or f"Version {version} of {name}",
            dataset_type=name.split(" ")[0].upper(),
            version=version,
            total_samples=validation["total_files"],
            num_classes=validation["class_count"],
            quality_score=validation["quality_score"],
            checksum=validation["checksum"],
            created_at=time.time(),
        )

        # Save metadata
        metadata_path = self.base_path / name / version / "metadata.json"
        metadata_path.parent.mkdir(parents=True, exist_ok=True)

        with open(metadata_path, "w") as f:
            json.dump({
                "name": metadata.name,
                "description": metadata.description,
                "dataset_type": metadata.dataset_type,
                "version": metadata.version,
                "total_samples": metadata.total_samples,
                "num_classes": metadata.num_classes,
                "splits": metadata.splits,
                "source": metadata.source,
                "quality_score": metadata.quality_score,
                "checksum": metadata.checksum,
                "created_by": metadata.created_by,
                "created_at": metadata.created_at,
            }, f, indent=2)

        print(f"  Version {version} created: {metadata_path}")
        print(f"  Samples: {metadata.total_samples} | Classes: {metadata.num_classes}")

        return metadata

    def generate_synthetic_data(self, config: dict) -> dict:
        """Generate synthetic training data with augmentations.

        Args:
            config: Generation configuration.

        Returns:
            Generation job info.
        """
        sample_count = config.get("sampleCount", 5000)
        augmentations = config.get("augmentations", ["brightness", "rotation", "occlusion"])
        base_class = config.get("baseClass", "FACE")

        job_id = f"SYNTH-{uuid.uuid4().hex[:8].upper()}"

        print(f"[DatasetManager] Synthetic Data Generation: {job_id}")
        print(f"  Samples: {sample_count}")
        print(f"  Augmentations: {', '.join(augmentations)}")
        print(f"  Base Class: {base_class}")

        time.sleep(1.0)

        # Simulated generation
        generated_per_class = sample_count // 500  # Assume 500 base classes
        actual_generated = generated_per_class * 500

        result = {
            "job_id": job_id,
            "status": "COMPLETED",
            "total_generated": actual_generated,
            "base_classes": 500,
            "samples_per_class": generated_per_class,
            "augmentations_applied": len(augmentations),
            "output_path": f"/data/datasets/synthetic/{job_id}",
            "processing_time_seconds": int(sample_count / 100 * 3),
        }

        print(f"  Generated {actual_generated} synthetic samples across 500 classes")
        return result

    def export_dataset(self, dataset_name: str, version: str,
                       format: str = "COCO", output_path: str = None) -> str:
        """Export dataset in standard format (COCO, YOLO, TFRecord).

        Args:
            dataset_name: Dataset name.
            version: Dataset version.
            format: Export format (COCO, YOLO, TFRecord).
            output_path: Optional output path.

        Returns:
            Export file path.
        """
        if output_path is None:
            output_path = f"/data/exports/{dataset_name}_{version}_{format}.json"

        print(f"[DatasetManager] Exporting {dataset_name} v{version} as {format}")
        time.sleep(0.5)

        export_data = {
            "info": {
                "dataset": dataset_name,
                "version": version,
                "format": format,
                "exported_at": time.time(),
            },
            "categories": [{"id": i, "name": f"class_{i}"} for i in range(10)],
            "images": [],
            "annotations": [],
        }

        with open(output_path, "w") as f:
            json.dump(export_data, f, indent=2)

        print(f"  Exported to: {output_path}")
        return output_path

    def _compute_checksum(self, file_path: str) -> str:
        """Compute SHA-256 checksum of a file.

        Args:
            file_path: Path to file.

        Returns:
            Hex digest string.
        """
        try:
            with open(file_path, "rb") as f:
                return hashlib.sha256(f.read(8192)).hexdigest()
        except Exception:
            return ""


if __name__ == "__main__":
    manager = DatasetManager()

    # Create a new version
    metadata = manager.create_version(
        name="Student Face Dataset",
        version="2.0.0",
        source_path="/data/datasets/student_faces",
        description="Updated with 200 new students and lighting variations",
    )

    # Export
    manager.export_dataset("Student Face Dataset", "2.0.0", "COCO")

    # Generate synthetic data
    result = manager.generate_synthetic_data({
        "sampleCount": 10000,
        "augmentations": ["brightness", "rotation", "occlusion", "noise"],
    })

    print(json.dumps(result, indent=2))
