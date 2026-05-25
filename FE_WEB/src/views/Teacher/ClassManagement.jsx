import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addClass, editClass, deleteClass } from '../../store/classSlice';
import Card from '../../components/Common/Card';
import { Plus, Edit2, Trash2, Search, ArrowRight, BookOpen } from 'lucide-react';
import { getSemesters } from '../../services/api';

export default function ClassManagement({ onSelectClass }) {
  const { classesList } = useSelector((state) => state.classes);
  const dispatch = useDispatch();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null if adding new class

  // Form states
  const [courseCode, setCourseCode] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState('');

  React.useEffect(() => {
    getSemesters()
      .then(data => setSemesters(data || []))
      .catch(err => console.error("Lỗi lấy danh sách học kỳ:", err));
  }, []);

  const filteredClasses = classesList.filter(
    (c) =>
      c.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setEditingId(null);
    setCourseCode('');
    setSubject('');
    setDescription('');
    const activeSem = semesters.find(s => s.isActive);
    setSemesterId(activeSem ? activeSem.id : '');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c) => {
    setEditingId(c.id);
    setCourseCode(c.courseCode);
    setSubject(c.subject);
    setDescription(c.description);
    setSemesterId(c.semester?.id || '');
    setIsModalOpen(true);
  };

  const handleDelete = (id, code) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa lớp học ${code} không?`)) {
      dispatch(deleteClass(id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!courseCode.trim() || !subject.trim()) {
      alert('Vui lòng điền mã lớp và tên môn học!');
      return;
    }

    const payload = {
      courseCode,
      subject,
      description,
      semesterId: semesterId ? parseInt(semesterId) : null
    };

    if (editingId) {
      dispatch(editClass({ id: editingId, ...payload }));
    } else {
      dispatch(addClass(payload));
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 py-4">
      {/* Header and Controls Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Quản lý lớp học</h1>
          <p className="text-xs text-slate-500 mt-0.5">Danh sách các lớp học do bạn phụ trách giảng dạy</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-xl font-bold shadow-md shadow-primary/20 transition duration-150"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm lớp học</span>
        </button>
      </div>

      {/* Search Input Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm lớp học theo Mã lớp hoặc Tên môn học..."
          className="w-full text-sm text-slate-700 bg-transparent outline-none"
        />
      </div>

      {/* Grid of Class Cards */}
      {filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((c) => (
            <Card
              key={c.id}
              className="flex flex-col h-full border border-slate-200"
              title={c.courseCode}
              subtitle={`Sĩ số: ${c.studentsCount} học viên`}
              action={
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(c)}
                    title="Chỉnh sửa"
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id, c.courseCode)}
                    title="Xóa lớp"
                    className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 hover:text-rose-700 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              }
            >
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-base mb-2">{c.subject}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">
                    {c.description || 'Không có mô tả chi tiết cho lớp học này.'}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                  <div className="text-xs font-semibold text-slate-500">
                    Tỷ lệ đi học: <span className="text-emerald-600 font-bold">{c.attendanceRate}%</span>
                  </div>
                  <button
                    onClick={() => onSelectClass(c.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline hover:translate-x-1 transition-transform"
                  >
                    <span>Xem chi tiết</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center text-slate-400">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium">Không tìm thấy lớp học nào khớp với từ khóa tìm kiếm!</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingId ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Mã lớp học *</label>
                <input
                  type="text"
                  required
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder="VD: INT3306"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Tên môn học *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="VD: Nhận dạng khuôn mặt & AI"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Chọn Học kỳ *</label>
                <select
                  value={semesterId}
                  onChange={(e) => setSemesterId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition"
                >
                  <option value="">-- Chọn Học kỳ --</option>
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      Học kỳ {s.code} {s.isActive ? '(Đang hoạt động)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập mô tả tóm tắt nội dung chính của môn học..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-sm font-semibold text-slate-600 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-xl font-bold transition shadow-md shadow-primary/10"
                >
                  {editingId ? 'Cập nhật' : 'Lưu lớp học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
