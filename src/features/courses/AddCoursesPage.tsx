import { LeftOutlined } from "@ant-design/icons"
import { TransparentIconButton } from "../../components/buttons/TransparentIconButton"
import { useNavigate } from "react-router-dom"
import { APP_ROUTE_PATHS } from "../../app/routePaths"

function AddCoursesPage() {
  const navigate = useNavigate()

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
    </div>
  )
}

export default AddCoursesPage
