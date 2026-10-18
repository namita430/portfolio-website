import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth, requireCsrf } from '../middleware/auth';
import { singleFileUpload } from '../middleware/upload';
import { uploadLimiter } from '../middleware/rateLimiters';
import * as projects from '../controllers/projectController';
import * as certificates from '../controllers/certificateController';
import * as experience from '../controllers/experienceController';
import * as skills from '../controllers/skillController';
import * as profile from '../controllers/profileController';
import * as contact from '../controllers/contactController';
import * as assets from '../controllers/assetController';
import { adminListQuery, projectBody } from '../validators/project';
import { certificateBody } from '../validators/certificate';
import { experienceBody } from '../validators/experience';
import { skillBody, skillCategoryBody } from '../validators/skill';
import { profileBody, settingsBody } from '../validators/profile';
import { messagePatchBody, messagesQuery } from '../validators/contact';
import { uploadBody } from '../validators/asset';
import { featureBody, idParam, publishBody, reorderBody } from '../validators/common';

/**
 * Every route below requires a valid session (requireAuth) and, for state-changing methods,
 * a matching CSRF token (requireCsrf). Authorisation is enforced here on the server, never by the UI.
 */
export const adminRoutes = Router();
adminRoutes.use(requireAuth, requireCsrf);

const id = { params: idParam };

adminRoutes.get('/overview', profile.getOverview);
adminRoutes.get('/tags', profile.listTags);

// Profile & settings
adminRoutes.get('/profile', profile.getProfile);
adminRoutes.put('/profile', validate({ body: profileBody }), profile.updateProfile);
adminRoutes.get('/settings', profile.getSettings);
adminRoutes.put('/settings', validate({ body: settingsBody }), profile.updateSettings);

// Resume
adminRoutes.get('/resume', profile.getResume);
adminRoutes.post('/resume', uploadLimiter, singleFileUpload, profile.replaceResume);
adminRoutes.delete('/resume', profile.removeResume);

// Generic file uploads (project images, certificate files, profile image, journey documents)
adminRoutes.post('/uploads', uploadLimiter, singleFileUpload, validate({ body: uploadBody }), assets.upload);
adminRoutes.post('/uploads/cleanup', assets.cleanup);
adminRoutes.delete('/uploads/:id', validate(id), assets.remove);

// Projects
adminRoutes.get('/projects', validate({ query: adminListQuery }), projects.listAdmin);
adminRoutes.post('/projects', validate({ body: projectBody }), projects.create);
adminRoutes.post('/projects/reorder', validate({ body: reorderBody }), projects.reorder);
adminRoutes.get('/projects/:id', validate(id), projects.getAdmin);
adminRoutes.put('/projects/:id', validate({ ...id, body: projectBody }), projects.update);
adminRoutes.patch('/projects/:id/publish', validate({ ...id, body: publishBody }), projects.publish);
adminRoutes.patch('/projects/:id/feature', validate({ ...id, body: featureBody }), projects.feature);
adminRoutes.delete('/projects/:id', validate(id), projects.remove);

// Certificates
adminRoutes.get('/certificates', validate({ query: adminListQuery }), certificates.listAdmin);
adminRoutes.post('/certificates', validate({ body: certificateBody }), certificates.create);
adminRoutes.post('/certificates/reorder', validate({ body: reorderBody }), certificates.reorder);
adminRoutes.get('/certificates/:id', validate(id), certificates.getAdmin);
adminRoutes.put('/certificates/:id', validate({ ...id, body: certificateBody }), certificates.update);
adminRoutes.patch('/certificates/:id/publish', validate({ ...id, body: publishBody }), certificates.publish);
adminRoutes.patch('/certificates/:id/feature', validate({ ...id, body: featureBody }), certificates.feature);
adminRoutes.delete('/certificates/:id', validate(id), certificates.remove);

// Journey
adminRoutes.get('/experience', experience.listAdmin);
adminRoutes.post('/experience', validate({ body: experienceBody }), experience.create);
adminRoutes.post('/experience/reorder', validate({ body: reorderBody }), experience.reorder);
adminRoutes.get('/experience/:id', validate(id), experience.getAdmin);
adminRoutes.put('/experience/:id', validate({ ...id, body: experienceBody }), experience.update);
adminRoutes.patch('/experience/:id/publish', validate({ ...id, body: publishBody }), experience.publish);
adminRoutes.delete('/experience/:id', validate(id), experience.remove);

// Skills (categories first so "categories" is never parsed as an :id)
adminRoutes.get('/skills', skills.listAdmin);
adminRoutes.post('/skills/categories', validate({ body: skillCategoryBody }), skills.createCategory);
adminRoutes.post('/skills/categories/reorder', validate({ body: reorderBody }), skills.reorderCategories);
adminRoutes.put('/skills/categories/:id', validate({ ...id, body: skillCategoryBody }), skills.updateCategory);
adminRoutes.delete('/skills/categories/:id', validate(id), skills.removeCategory);
adminRoutes.post('/skills/reorder', validate({ body: reorderBody }), skills.reorderSkills);
adminRoutes.post('/skills', validate({ body: skillBody }), skills.createSkill);
adminRoutes.put('/skills/:id', validate({ ...id, body: skillBody }), skills.updateSkill);
adminRoutes.delete('/skills/:id', validate(id), skills.removeSkill);

// Contact inbox
adminRoutes.get('/messages', validate({ query: messagesQuery }), contact.listAdmin);
adminRoutes.patch('/messages/:id', validate({ ...id, body: messagePatchBody }), contact.setRead);
adminRoutes.delete('/messages/:id', validate(id), contact.remove);
