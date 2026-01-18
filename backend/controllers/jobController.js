const { query } = require('../config/database');
const { awardPoints } = require('./pointsController');

// Post a new Job (any authenticated user can post)
const postJob = async (req, res) => {
  try {
    const { title, description, location, company, salary, jobType, requirements, contactEmail } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Job title is required' });
    }

    const result = await query(
      `INSERT INTO jobs (title, description, location, company, salary, job_type, requirements, contact_email, posted_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING id`,
      [title, description || null, location || null, company || null, salary || null, jobType || 'full-time', requirements || null, contactEmail || null, req.user.id]
    );

    const jobId = result[0]?.id;

    // Award points for posting a job
    await awardPoints(req.user.id, 'JOB_POST', `Posted job: ${title}`, { jobId });

    res.status(201).json({ 
      message: 'Job posted successfully',
      jobId,
      job: { id: jobId, title, description, location, company, salary, jobType, postedBy: req.user.id }
    });
  } catch (err) {
    console.error('Error posting job:', err);
    res.status(500).json({ message: 'Error posting job', details: err.message });
  }
};

// Get all jobs
const getJobs = async (req, res) => {
  try {
    const jobs = await query(
      `SELECT j.*, 
              u.firstname || ' ' || u.lastname as "postedByName",
              u.company as "postedByCompany"
       FROM jobs j
       LEFT JOIN users u ON j.posted_by = u.id
       WHERE j.is_active = true
       ORDER BY j.created_at DESC`
    );

    // Transform to camelCase
    const formattedJobs = jobs.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      location: job.location,
      company: job.company,
      salary: job.salary,
      jobType: job.job_type,
      requirements: job.requirements,
      contactEmail: job.contact_email,
      postedBy: job.posted_by,
      postedByName: job.postedByName,
      postedByCompany: job.postedByCompany,
      createdAt: job.created_at,
      isActive: job.is_active
    }));

    res.json(formattedJobs);
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ message: 'Error fetching jobs', details: err.message });
  }
};

// Get single job by ID
const getJob = async (req, res) => {
  try {
    const { id } = req.params;
    
    const jobs = await query(
      `SELECT j.*, 
              u.firstname || ' ' || u.lastname as "postedByName",
              u.company as "postedByCompany",
              u.email as "postedByEmail"
       FROM jobs j
       LEFT JOIN users u ON j.posted_by = u.id
       WHERE j.id = $1`,
      [id]
    );

    if (jobs.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const job = jobs[0];
    res.json({
      id: job.id,
      title: job.title,
      description: job.description,
      location: job.location,
      company: job.company,
      salary: job.salary,
      jobType: job.job_type,
      requirements: job.requirements,
      contactEmail: job.contact_email,
      postedBy: job.posted_by,
      postedByName: job.postedByName,
      postedByCompany: job.postedByCompany,
      createdAt: job.created_at,
      isActive: job.is_active
    });
  } catch (err) {
    console.error('Error fetching job:', err);
    res.status(500).json({ message: 'Error fetching job', details: err.message });
  }
};

// Delete job (owner or admin only)
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.user.userType;

    // Check if job exists and get owner
    const job = await query('SELECT posted_by FROM jobs WHERE id = $1', [id]);
    
    if (job.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Only owner or admin can delete
    if (job[0].posted_by !== userId && userType !== 'admin' && userType !== 'founder') {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }

    await query('DELETE FROM jobs WHERE id = $1', [id]);
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error('Error deleting job:', err);
    res.status(500).json({ message: 'Error deleting job', details: err.message });
  }
};

// Apply to a job
const applyJob = async (req, res) => {
  try {
    const { jobId, coverLetter } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    // Check if job exists
    const job = await query('SELECT id, title FROM jobs WHERE id = $1', [jobId]);
    if (job.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Prevent duplicate applications
    const existing = await query(
      'SELECT id FROM job_applications WHERE user_id = $1 AND job_id = $2',
      [req.user.id, jobId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Already applied to this job' });
    }

    const result = await query(
      `INSERT INTO job_applications (user_id, job_id, cover_letter, status, created_at) 
       VALUES ($1, $2, $3, 'pending', NOW()) RETURNING id`,
      [req.user.id, jobId, coverLetter || null]
    );

    // Award points for applying to a job
    await awardPoints(req.user.id, 'JOB_APPLICATION', `Applied to: ${job[0].title}`, { jobId });

    res.status(201).json({ 
      message: 'Application submitted successfully',
      applicationId: result[0]?.id
    });
  } catch (err) {
    console.error('Error applying for job:', err);
    res.status(500).json({ message: 'Error applying for job', details: err.message });
  }
};

// View all applications of current user
const getMyApplications = async (req, res) => {
  try {
    const applications = await query(
      `SELECT a.*, j.title as job_title, j.company as job_company
       FROM job_applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    const formatted = applications.map(app => ({
      id: app.id,
      jobId: app.job_id,
      jobTitle: app.job_title,
      jobCompany: app.job_company,
      coverLetter: app.cover_letter,
      status: app.status,
      createdAt: app.created_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ message: 'Error fetching applications', details: err.message });
  }
};

// Get my posted jobs
const getMyJobs = async (req, res) => {
  try {
    const jobs = await query(
      `SELECT * FROM jobs WHERE posted_by = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );

    const formatted = jobs.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      location: job.location,
      company: job.company,
      salary: job.salary,
      jobType: job.job_type,
      createdAt: job.created_at,
      isActive: job.is_active
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching my jobs:', err);
    res.status(500).json({ message: 'Error fetching my jobs', details: err.message });
  }
};

module.exports = {
  postJob,
  getJobs,
  getJob,
  deleteJob,
  applyJob,
  getMyApplications,
  getMyJobs
};
