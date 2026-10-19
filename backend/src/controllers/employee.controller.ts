import type { Request, Response } from 'express';
import { employeeService } from '../services/employee.service';
import type { EmployeeListQuery, EmployeePerformanceQuery } from '../validators/employee.validator';

export const employeeController = {
  async list(req: Request, res: Response) {
    res.json(await employeeService.list(req.query as unknown as EmployeeListQuery));
  },

  async get(req: Request, res: Response) {
    res.json(await employeeService.getDetail(Number(req.params.id)));
  },

  async create(req: Request, res: Response) {
    res.status(201).json(await employeeService.create(req.user!, req.body));
  },

  async update(req: Request, res: Response) {
    res.json(await employeeService.update(req.user!, Number(req.params.id), req.body));
  },

  async remove(req: Request, res: Response) {
    await employeeService.remove(req.user!, Number(req.params.id));
    res.status(204).end();
  },

  async performance(req: Request, res: Response) {
    res.json(await employeeService.performance(Number(req.params.id), req.query as unknown as EmployeePerformanceQuery));
  },
};
