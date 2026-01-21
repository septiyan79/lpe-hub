// import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import GenLayout from './general/layouts/genLayout';

import ToDoList from './general/pages/ToDoList_Tailwind';
import Home from './general/pages/Home';
import Karyawan from './general/pages/Karyawan';
import Notes from './general/pages/Notes';
import NewNotes from './general/pages/NewNotes';
import GenLayout from './general/layouts/genLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GenLayout />}>
          <Route path='/' element={<Home />} />
          <Route path='/todolist' element={<ToDoList />} />
          <Route path='/karyawan' element={<Karyawan />} />
          <Route path='/notes' element={<Notes />} />
          <Route path='/newNotes' element={<NewNotes />} />
        </Route>
      </Routes>
    </BrowserRouter >
  );
}

export default App;
