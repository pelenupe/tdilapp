const { Job, Application } = require('../models');
const { awardPoints } = require('./pointsController');

// Post a new Job (Employer role)
const postJob = async (req, res) => {
  try {
    const { title, description, location, company } = req.body;

    const newJob = await Job.create({
      title,
      description,
      location,
      company,
      postedBy: req.user.id
    });

    res.status(201).json(newJob);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error posting job' });
  }
};

// Get all jobs
const getJobs = async (req, res) => {
  try {
    const jobs = await Job.findAll();
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching jobs' });
  }
};

// Apply to a job
const applyJob = async (req, res) => {
  try {
    const { jobId } = req.body;

    // Prevent duplicate applications
    const alreadyApplied = await Application.findOne({
      where: { userId: req.user.id, jobId }
    });

    if (alreadyApplied) {
      return res.status(400).json({ message: 'Already applied to this job' });
    }

    const application = await Application.create({
      userId: req.user.id,
      jobId
    });

    // Award points for applying to a job
    await awardPoints(req.user.id, 'Job Application', 50);

    res.status(201).json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error applying for job' });
  }
};

// View all applications of current user
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.findAll({
      where: { userId: req.user.id }
    });
    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching applications' });
  }
};

module.exports = {
  postJob,
  getJobs,
  applyJob,
  getMyApplications
};
