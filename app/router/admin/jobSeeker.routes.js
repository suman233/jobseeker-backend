const express = require('express')
const router = express.Router()
const routerLabel = require('route-label')
const jobseekerController = require('../../module/jobseeker/controller/jobseekerController')
const requireAdmin = require('../../middleware/requireAdmin')
const namedRouter = routerLabel(router)

router.use(requireAdmin)

namedRouter.get('jobSeeker-list', '/job-seeker', jobseekerController.JobSeekerListPage)

module.exports = router
