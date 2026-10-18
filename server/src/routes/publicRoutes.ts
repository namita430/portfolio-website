import { Router } from 'express';
import { validate } from '../middleware/validate';
import { contactLimiter } from '../middleware/rateLimiters';
import * as site from '../controllers/siteController';
import * as projects from '../controllers/projectController';
import * as certificates from '../controllers/certificateController';
import * as contact from '../controllers/contactController';
import { publicProjectsQuery, slugParam } from '../validators/project';
import { publicCertificatesQuery } from '../validators/certificate';
import { contactBody } from '../validators/contact';

/** Anonymous endpoints. Every query here is restricted to PUBLISHED content in the service layer. */
export const publicRoutes = Router();

publicRoutes.get('/health', site.health);
publicRoutes.get('/health/ready', site.ready);
publicRoutes.get('/site', site.getSite);
publicRoutes.get('/skills', site.getSkills);
publicRoutes.get('/experience', site.getExperience);
publicRoutes.get('/resume', site.getResume);

publicRoutes.get('/projects/filters', projects.filters);
publicRoutes.get('/projects', validate({ query: publicProjectsQuery }), projects.listPublic);
publicRoutes.get('/projects/:slug', validate({ params: slugParam }), projects.getBySlug);

publicRoutes.get('/certificates', validate({ query: publicCertificatesQuery }), certificates.listPublic);

publicRoutes.post('/contact', contactLimiter, validate({ body: contactBody }), contact.submit);
