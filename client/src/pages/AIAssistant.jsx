import { useEffect, useState } from 'react'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'

function AIAssistant() {
  const { user } = useAuth()

  const [goal, setGoal] = useState('')
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [insights, setInsights] = useState([])

  const [improveForm, setImproveForm] = useState({
    title: '',
    description: '',
    priority: 'medium'
  })

  const [improvedTask, setImprovedTask] = useState(null)

  const [priorityForm, setPriorityForm] = useState({
    title: '',
    description: '',
    dueDate: ''
  })

  const [priorityResult, setPriorityResult] = useState(null)

  const [error, setError] = useState('')
  const [retryType, setRetryType] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const [activeTool, setActiveTool] = useState('breakdown')

  useEffect(() => {
    async function loadAssistantData() {
      const [projectResult, insightResult] = await Promise.allSettled([
        apiRequest('/projects'),
        apiRequest('/ai/insights')
      ])

      if (projectResult.status === 'fulfilled') {
        setProjects(projectResult.value.projects)
      }

      if (insightResult.status === 'fulfilled') {
        setInsights(insightResult.value.insights || [])
      }

      if (projectResult.status === 'rejected') {
        setError(projectResult.reason.message)
      }

      if (insightResult.status === 'rejected') {
        setError(insightResult.reason.message)
      }
    }

    loadAssistantData()
  }, [])

  async function requestBreakdown() {
    if (!goal.trim()) return

    setIsThinking(true)
    setError('')
    setRetryType('')

    try {
      const data = await apiRequest('/ai/task-breakdown', {
        method: 'POST',
        body: JSON.stringify({
          goal,
          projectId: projectId || undefined
        })
      })

      setSuggestions(data.tasks || [])
      setSelected(new Set())
    } catch (requestError) {
      setError(requestError.message)
      setRetryType('breakdown')
    } finally {
      setIsThinking(false)
    }
  }

  async function requestImprovement() {
    if (!improveForm.title.trim()) return

    setIsThinking(true)
    setError('')
    setRetryType('')

    try {
      const data = await apiRequest('/ai/improve-task', {
        method: 'POST',
        body: JSON.stringify(improveForm)
      })

      setImprovedTask(data)
    } catch (requestError) {
      setError(requestError.message)
      setRetryType('improvement')
    } finally {
      setIsThinking(false)
    }
  }

  async function requestPriority() {
    if (!priorityForm.title.trim()) return

    setIsThinking(true)
    setError('')
    setRetryType('')

    try {
      const data = await apiRequest('/ai/suggest-priority', {
        method: 'POST',
        body: JSON.stringify({
          ...priorityForm,
          projectId: projectId || undefined
        })
      })

      setPriorityResult(data)
    } catch (requestError) {
      setError(requestError.message)
      setRetryType('priority')
    } finally {
      setIsThinking(false)
    }
  }

  async function addSelectedTasks() {
    setIsAdding(true)

    try {
      await Promise.all(
        suggestions
          .filter((_, index) => selected.has(index))
          .map((task) =>
            apiRequest('/tasks', {
              method: 'POST',
              body: JSON.stringify({
                title: task.title,
                description: task.description,
                priority: task.priority,
                projectId: projectId || null
              })
            })
          )
      )

      setSuggestions((current) =>
        current.filter((_, index) => !selected.has(index))
      )

      setSelected(new Set())
      setError('')
    } catch (addError) {
      setError(addError.message)
    } finally {
      setIsAdding(false)
    }
  }

  async function applyImprovement() {
    if (!improvedTask) return

    try {
      await apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: improvedTask.improvedTitle,
          description: improvedTask.suggestion,
          priority: improvedTask.priority,
          projectId: projectId || null
        })
      })

      setImprovedTask(null)

      setImproveForm({
        title: '',
        description: '',
        priority: 'medium'
      })
    } catch (applyError) {
      setError(applyError.message)
    }
  }

  function retry() {
    if (retryType === 'breakdown') requestBreakdown()

    if (retryType === 'improvement') requestImprovement()

    if (retryType === 'priority') requestPriority()
  }

  return (
    <section className="page-content ai-page">

      {/* HEADER */}

      <div className="ai-header">

        <div>
          <p className="eyebrow">AI WORKSPACE</p>

          <h1>Work smarter.</h1>

          <p className="dashboard-lede">
            Turn ideas into clear actions with your personal productivity assistant.
          </p>
        </div>

        <div className="ai-context">
          <label>
            Project context

            <select
              aria-label="AI project"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">No project</option>

              {projects.map((project) => (
                <option value={project.id} key={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        </div>

      </div>

      {/* ERROR */}

      {error && (
        <div className="ai-error">

          <p className="form-error">{error}</p>

          {retryType && (
            <button
              className="text-button"
              onClick={retry}
              type="button"
            >
              Retry
            </button>
          )}

        </div>
      )}

      {/* AI ACTIONS */}

      <section className="ai-actions">

        <div className="ai-actions-heading">

          <p className="card-kicker">
            WHAT CAN I HELP WITH?
          </p>

          <h2>Choose an AI action</h2>

        </div>

        <div className="ai-action-grid">

          <button
            type="button"
            className={`ai-action-card ${
              activeTool === 'breakdown' ? 'active' : ''
            }`}
            onClick={() => setActiveTool('breakdown')}
          >

            <span className="ai-action-icon">✦</span>

            <strong>Break down a goal</strong>

            <p>
              Turn a big goal into manageable tasks.
            </p>

          </button>


          <button
            type="button"
            className={`ai-action-card ${
              activeTool === 'improve' ? 'active' : ''
            }`}
            onClick={() => setActiveTool('improve')}
          >

            <span className="ai-action-icon">✎</span>

            <strong>Improve a task</strong>

            <p>
              Make vague tasks clear and actionable.
            </p>

          </button>


          <button
            type="button"
            className={`ai-action-card ${
              activeTool === 'priority' ? 'active' : ''
            }`}
            onClick={() => setActiveTool('priority')}
          >

            <span className="ai-action-icon">◎</span>

            <strong>Suggest priority</strong>

            <p>
              Decide what deserves your attention first.
            </p>

          </button>

        </div>

      </section>


      {/* AI WORKSPACE */}

      <section className="ai-workspace">

        {/* BREAKDOWN */}

        {activeTool === 'breakdown' && (

          <div className="ai-tool-content">

            <div className="ai-tool-heading">

              <span className="card-kicker">
                GOAL PLANNER
              </span>

              <h2>What do you want to achieve?</h2>

              <p>
                Describe your goal and AI will help break it into actionable steps.
              </p>

            </div>


            <form
              className="ai-form"
              onSubmit={(event) => {
                event.preventDefault()
                requestBreakdown()
              }}
            >

              <textarea
                aria-label="Goal"
                placeholder="Example: Prepare for my final exams..."
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                maxLength="2000"
              />

              <button
                className="primary-button"
                disabled={isThinking}
                type="submit"
              >
                {isThinking
                  ? 'Thinking...'
                  : 'Generate plan ✦'}
              </button>

            </form>


            {suggestions.length > 0 && (

              <div className="suggestion-list">

                <div className="suggestion-header">

                  <div>

                    <span>AI suggestions</span>

                    <p>
                      Select the tasks you want to add.
                    </p>

                  </div>

                  <button
                    className="text-button"
                    disabled={!selected.size || isAdding}
                    onClick={addSelectedTasks}
                    type="button"
                  >
                    {isAdding
                      ? 'Adding...'
                      : `Add selected (${selected.size})`}
                  </button>

                </div>


                {suggestions.map((suggestion, index) => (

                  <div
                    className="suggestion-item"
                    key={`${suggestion.title}-${index}`}
                  >

                    <input
                      aria-label={`Select ${suggestion.title}`}
                      type="checkbox"
                      checked={selected.has(index)}
                      onChange={() =>
                        setSelected((current) => {

                          const next = new Set(current)

                          if (next.has(index)) {
                            next.delete(index)
                          } else {
                            next.add(index)
                          }

                          return next
                        })
                      }
                    />


                    <div>

                      <input
                        aria-label={`Suggested title ${index + 1}`}
                        value={suggestion.title}
                        onChange={(event) =>
                          setSuggestions((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    title: event.target.value
                                  }
                                : item
                            )
                          )
                        }
                      />


                      <textarea
                        aria-label={`Suggested description ${index + 1}`}
                        value={suggestion.description}
                        onChange={(event) =>
                          setSuggestions((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    description: event.target.value
                                  }
                                : item
                            )
                          )
                        }
                      />


                      <select
                        aria-label={`Suggested priority ${index + 1}`}
                        value={suggestion.priority}
                        onChange={(event) =>
                          setSuggestions((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    priority: event.target.value
                                  }
                                : item
                            )
                          )
                        }
                      >

                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>

                      </select>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        )}


        {/* IMPROVE TASK */}

        {activeTool === 'improve' && (

          <div className="ai-tool-content">

            <div className="ai-tool-heading">

              <span className="card-kicker">
                TASK REFINER
              </span>

              <h2>Make a vague task actionable.</h2>

              <p>
                Give AI a rough task and get a clearer version you can actually work on.
              </p>

            </div>


            <form
              className="ai-form"
              onSubmit={(event) => {
                event.preventDefault()
                requestImprovement()
              }}
            >

              <input
                aria-label="Vague task"
                placeholder="Example: Work on project"
                value={improveForm.title}
                onChange={(event) =>
                  setImproveForm({
                    ...improveForm,
                    title: event.target.value
                  })
                }
              />


              <textarea
                aria-label="Task context"
                placeholder="Add optional context..."
                value={improveForm.description}
                onChange={(event) =>
                  setImproveForm({
                    ...improveForm,
                    description: event.target.value
                  })
                }
              />


              <button
                className="primary-button"
                disabled={isThinking}
                type="submit"
              >
                {isThinking
                  ? 'Thinking...'
                  : 'Improve with AI ✦'}
              </button>

            </form>


            {improvedTask && (

              <div className="improved-task">

                <span className="card-kicker">
                  AI RECOMMENDATION
                </span>

                <strong>
                  {improvedTask.improvedTitle}
                </strong>

                <p>
                  {improvedTask.suggestion}
                </p>

                <span>
                  {improvedTask.priority} priority
                </span>

                <button
                  className="primary-button"
                  onClick={applyImprovement}
                  type="button"
                >
                  Add as task
                </button>

              </div>

            )}

          </div>

        )}


        {/* PRIORITY */}

        {activeTool === 'priority' && (

          <div className="ai-tool-content">

            <div className="ai-tool-heading">

              <span className="card-kicker">
                PRIORITY ENGINE
              </span>

              <h2>Choose what deserves attention.</h2>

              <p>
                Let AI evaluate your task and suggest the right priority level.
              </p>

            </div>


            <form
              className="priority-form"
              onSubmit={(event) => {
                event.preventDefault()
                requestPriority()
              }}
            >

              <input
                aria-label="Priority task title"
                placeholder="Task title"
                value={priorityForm.title}
                onChange={(event) =>
                  setPriorityForm({
                    ...priorityForm,
                    title: event.target.value
                  })
                }
              />


              <input
                aria-label="Priority due date"
                type="date"
                value={priorityForm.dueDate}
                onChange={(event) =>
                  setPriorityForm({
                    ...priorityForm,
                    dueDate: event.target.value
                  })
                }
              />


              <button
                className="primary-button"
                disabled={isThinking}
                type="submit"
              >
                {isThinking
                  ? 'Analyzing...'
                  : 'Analyze priority ✦'}
              </button>

            </form>


            {priorityResult && (

              <div
                className={`priority-result ${priorityResult.priority}`}
              >

                <span className="card-kicker">
                  AI PRIORITY SUGGESTION
                </span>

                <strong>
                  {priorityResult.priority}
                </strong>

                <p>
                  {priorityResult.reason}
                </p>

                <button
                  className="text-button"
                  onClick={() => setPriorityResult(null)}
                  type="button"
                >
                  Dismiss suggestion
                </button>

              </div>

            )}

          </div>

        )}

      </section>


      {/* INSIGHTS */}

      <section className="insights-panel ai-insights-section">

        <div className="insights-heading">

          <div>

            <span className="card-kicker">
              PRODUCTIVITY INTELLIGENCE
            </span>

            <h2>Your workspace insights</h2>

          </div>

          <span className="insight-badge">
            AI Powered
          </span>

        </div>


        {insights.length === 0 ? (

          <div className="insights-empty">

            <span>✦</span>

            <div>

              <strong>
                Your insights are waiting
              </strong>

              <p>
                Keep working on tasks and projects to unlock personalised productivity insights.
              </p>

            </div>

          </div>

        ) : (

          <div className="insights-list">

            {insights.map((insight, index) => (

              <article
                className="insight"
                key={`${insight}-${index}`}
              >

                <span>✦</span>

                <p>{insight}</p>

              </article>

            ))}

          </div>

        )}

      </section>


      {/* FOOTNOTE */}

      <p className="ai-note">

        Hi {user?.name?.split(' ')[0] || 'there'}.
        AI suggestions are always reviewable before anything changes in your workspace.

      </p>

    </section>
  )
}

export default AIAssistant