import { LeftOutlined } from "@ant-design/icons"
import { TransparentIconButton } from "../../components/buttons/TransparentIconButton"
import { useNavigate } from "react-router-dom"
import { APP_ROUTE_PATHS } from "../../app/routePaths"
import { Button, Input, InputNumber, Select } from "antd"
import { useState } from "react"

function AddCoursesPage() {
  const navigate = useNavigate()
  const [courseName, setCourseName] = useState("")
  const [startNode, setStartNode] = useState<number | null>(null)
  const [endNode, setEndNode] = useState<number | null>(null)
  const [startWeek, setStartWeek] = useState<number | null>(null)
  const [endWeek, setEndWeek] = useState<number | null>(null)
  const [classroom, setClassroom] = useState("")
  const [teacher, setTeacher] = useState("")

  function handleReturn() {
    navigate(APP_ROUTE_PATHS.courses)
  }

  return (
    <div className='add-courses-page'>
      <header className='add-courses-header'>
        <div className='add-courses-left-panel'>
          <TransparentIconButton
            ariaLabel='返回'
            icon={<LeftOutlined />}
            onClick={handleReturn}
          />
        </div>

        <div className='add-courses-title'>添加课程</div>
      </header>

      <div className='add-courses-content'>
        <div className='add-courses-form-card'>
          <div className='add-courses-form-grid'>
            <div className='add-courses-field'>
              <span className='add-courses-label'>课程名称</span>
              <Input
                size='large'
                placeholder='课程名称'
                value={courseName}
                onChange={(event) => setCourseName(event.target.value)}
              />
            </div>

            <div className='add-courses-field'>
              <span className='add-courses-label'>上课时间（星期）</span>
              <Select size='large' style={{ width: '100%' }} />
            </div>

            <div className='add-courses-field'>
              <span className='add-courses-label'>节数</span>
              <div className='add-courses-range'>
                <label className='add-courses-range-field'>
                  <span>从</span>
                  <InputNumber
                    size='large'
                    style={{ width: '100%' }}
                    value={startNode}
                    onChange={setStartNode}
                  />
                </label>
                <label className='add-courses-range-field'>
                  <span>到</span>
                  <InputNumber
                    size='large'
                    style={{ width: '100%' }}
                    value={endNode}
                    onChange={setEndNode}
                  />
                </label>
              </div>
            </div>

            <div className='add-courses-field'>
              <span className='add-courses-label'>周数</span>
              <div className='add-courses-range'>
                <label className='add-courses-range-field'>
                  <span>从</span>
                  <InputNumber
                    size='large'
                    style={{ width: '100%' }}
                    value={startWeek}
                    onChange={setStartWeek}
                  />
                </label>
                <label className='add-courses-range-field'>
                  <span>到</span>
                  <InputNumber
                    size='large'
                    style={{ width: '100%' }}
                    value={endWeek}
                    onChange={setEndWeek}
                  />
                </label>
              </div>
            </div>

            <div className='add-courses-field'>
              <span className='add-courses-label'>上课地点</span>
              <Input
                size='large'
                placeholder='上课地点'
                value={classroom}
                onChange={(event) => setClassroom(event.target.value)}
              />
            </div>

            <div className='add-courses-field'>
              <span className='add-courses-label'>教师（选填）</span>
              <Input
                size='large'
                placeholder='教师'
                value={teacher}
                onChange={(event) => setTeacher(event.target.value)}
              />
            </div>
          </div>

          <Button className='add-courses-save-button' type='primary' size='large'>
            保存
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AddCoursesPage
