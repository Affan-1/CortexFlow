import api from "./api";

/**
 * Normalize workflow responses.
 * Backend returns { message, workflow }, while some older
 * endpoints may return the workflow directly.
 */
const normalizeWorkflow = (data) => {
  return data?.workflow || data;
};

/**
 * Get all workflows for the authenticated user.
 */
export const getWorkflows = async () => {
  const response = await api.get("/workflows");

  return response.data?.workflows || response.data || [];
};

/**
 * Get a single workflow by ID.
 */
export const getWorkflowById = async (id) => {
  const response = await api.get(`/workflows/${id}`);

  return normalizeWorkflow(response.data);
};

/**
 * Create a new workflow.
 */
export const createWorkflow = async (workflowData) => {
  const response = await api.post("/workflows", workflowData);

  return normalizeWorkflow(response.data);
};

/**
 * Update an existing workflow.
 */
export const updateWorkflow = async (id, updates) => {
  const response = await api.put(`/workflows/${id}`, updates);

  return normalizeWorkflow(response.data);
};

/**
 * Delete a workflow.
 */
export const deleteWorkflow = async (id) => {
  const response = await api.delete(`/workflows/${id}`);

  return response.data;
};

/**
 * Run a workflow manually.
 */
export const runWorkflow = async (workflowId) => {
  const response = await api.post(`/executions/run/${workflowId}`);

  return response.data?.execution || response.data;
};

/**
 * Get executions.
 *
 * Optional workflowId can be supplied to only retrieve
 * executions belonging to one workflow.
 */
export const getExecutions = async (workflowId) => {
  const response = await api.get("/executions", {
    params: workflowId ? { workflowId } : undefined,
  });

  return response.data?.executions || response.data || [];
};

/**
 * Get a single execution.
 */
export const getExecutionById = async (executionId) => {
  const response = await api.get(`/executions/${executionId}`);

  return response.data?.execution || response.data;
};

/**
 * Retry a failed execution.
 */
export const retryExecution = async (executionId) => {
  const response = await api.post(`/executions/${executionId}/retry`);

  return response.data?.execution || response.data;
};

/**
 * Delete an execution.
 */
export const deleteExecution = async (executionId) => {
  const response = await api.delete(`/executions/${executionId}`);

  return response.data;
};