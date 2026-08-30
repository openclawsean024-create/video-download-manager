import { Router, Request, Response } from 'express';
import { taskRepo } from '../services/database';

export const statsRouter = Router();

statsRouter.get('/', (_req: Request, res: Response) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  const todayTasks = taskRepo.findAll().filter((t) => t.createdAt >= todayMs).length;
  const completedToday = taskRepo.countByStatus('completed', todayMs);
  const downloading = taskRepo.countByStatus('downloading');
  const failedToday = taskRepo.countByStatus('failed', todayMs);
  const totalDownloaded = taskRepo.totalBytes();
  const totalTasks = taskRepo.countAll();
  const completed = taskRepo.countByStatus('completed');
  const successRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

  res.json({
    ok: true,
    data: {
      todayTasks,
      completedToday,
      downloading,
      failedToday,
      totalDownloaded,
      totalTasks,
      successRate,
      platformDistribution: taskRepo.platformDistribution(),
      dailyDownloads: taskRepo.dailyDownloads(7),
      recentTasks: taskRepo.recentTasks(8),
    },
  });
});