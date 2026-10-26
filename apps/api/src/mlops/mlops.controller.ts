// ─── SmartCampus AI — MLOps Controller ──────────────────────

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MlopsService } from './mlops.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../_shared/enums/roles';

@Controller('mlops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
export class MlopsController {
  constructor(private readonly mlops: MlopsService) {}

  // ── Overview ──────────────────────────────────────────────
  @Get('overview')
  getOverview() {
    return this.mlops.getOverview();
  }

  // ── Datasets ──────────────────────────────────────────────
  @Get('datasets')
  getAllDatasets() {
    return this.mlops.getDatasets();
  }

  @Get('datasets/:id')
  getDataset(@Param('id') id: string) {
    return this.mlops.getDataset(id);
  }

  @Post('datasets')
  createDataset(@Body() body: any) {
    return this.mlops.createDataset(body);
  }

  @Get('datasets/:id/versions')
  getDatasetVersions(@Param('id') id: string) {
    return this.mlops.getDatasetVersions(id);
  }

  // ── Experiments ───────────────────────────────────────────
  @Get('experiments')
  getAllExperiments() {
    return this.mlops.getExperiments();
  }

  @Get('experiments/:id')
  getExperiment(@Param('id') id: string) {
    return this.mlops.getExperiment(id);
  }

  @Post('experiments')
  createExperiment(@Body() body: any) {
    return this.mlops.createExperiment(body);
  }

  // ── Training Jobs ─────────────────────────────────────────
  @Get('training-jobs')
  getAllTrainingJobs() {
    return this.mlops.getTrainingJobs();
  }

  @Get('training-jobs/:id')
  getTrainingJob(@Param('id') id: string) {
    return this.mlops.getTrainingJob(id);
  }

  @Get('experiments/:id/training-jobs')
  getTrainingJobsByExperiment(@Param('id') id: string) {
    return this.mlops.getTrainingJobsByExperiment(id);
  }

  // ── Models ────────────────────────────────────────────────
  @Get('models')
  getAllModels() {
    return this.mlops.getModels();
  }

  @Get('models/:id')
  getModel(@Param('id') id: string) {
    return this.mlops.getModel(id);
  }

  @Get('models/type/:type')
  getModelsByType(@Param('type') type: string) {
    return this.mlops.getModelsByType(type);
  }

  @Get('models/status/:status')
  getModelsByStatus(@Param('status') status: string) {
    return this.mlops.getModelsByStatus(status);
  }

  // ── Feedback ──────────────────────────────────────────────
  @Get('feedback')
  getAllFeedback() {
    return this.mlops.getFeedback();
  }

  @Get('feedback/status/:status')
  getFeedbackByStatus(@Param('status') status: string) {
    return this.mlops.getFeedbackByStatus(status);
  }

  @Post('feedback')
  createFeedback(@Body() body: any) {
    return this.mlops.createFeedback(body);
  }

  @Post('feedback/:id/resolve')
  resolveFeedback(@Param('id') id: string) {
    return this.mlops.resolveFeedback(id);
  }

  // ── Evaluations ───────────────────────────────────────────
  @Get('evaluations')
  getAllEvaluations() {
    return this.mlops.getEvaluations();
  }

  @Get('evaluations/model/:modelId')
  getEvaluationsByModel(@Param('modelId') modelId: string) {
    return this.mlops.getEvaluationsByModel(modelId);
  }

  // ── Governance ────────────────────────────────────────────
  @Get('governance')
  getGovernanceReport() {
    return this.mlops.getGovernanceReport();
  }

  // ── Synthetic Data ────────────────────────────────────────
  @Post('synthetic/generate')
  generateSyntheticData(@Body() body: any) {
    return this.mlops.generateSyntheticData(body);
  }
}
