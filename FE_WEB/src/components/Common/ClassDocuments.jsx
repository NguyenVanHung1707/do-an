import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Folder, FileText, FileImage, FileVideo, FileSpreadsheet, FileArchive, FileCode, File, 
  Upload, Plus, Trash2, Download, Settings, Shield, Search, 
  Users, X, Grid, List, RefreshCw, AlertCircle, Info, ChevronRight
} from 'lucide-react';
import { 
  getClassDocuments, uploadClassDocument, createClassFolder, 
  downloadClassDocument, deleteClassDocument, getClassStudentPermissions, 
  updateStudentPermissions, updateClassPermissionsBulk, getMyClassPermission 
} from '../../services/api';

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return '';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileIcon = (type, extension) => {
  if (type === 'FOLDER') return <Folder className="w-10 h-10 text-amber-500 fill-amber-500/10" />;
  const ext = extension?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
    return <FileImage className="w-10 h-10 text-emerald-500" />;
  }
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
    return <FileVideo className="w-10 h-10 text-rose-500" />;
  }
  if (['docx', 'doc', 'pdf', 'txt', 'rtf'].includes(ext)) {
    return <FileText className="w-10 h-10 text-blue-500" />;
  }
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="w-10 h-10 text-green-500" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive className="w-10 h-10 text-amber-600" />;
  }
  if (['html', 'css', 'js', 'json', 'py', 'java', 'cpp', 'c', 'sh'].includes(ext)) {
    return <FileCode className="w-10 h-10 text-indigo-500" />;
  }
  return <File className="w-10 h-10 text-slate-500" />;
};

export default function ClassDocuments({ classId, isTeacher = false }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigation & Tree
  const [currentFolder, setCurrentFolder] = useState(null); // Document object
  const [folderHistory, setFolderHistory] = useState([]); // Array of Document objects representing active trail
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  // User Permissions (for student)
  const [permissions, setPermissions] = useState({ canUploadDocuments: false, canDownloadDocuments: false });
  
  // Modals / Toggles
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [bulkPermissions, setBulkPermissions] = useState({ canUpload: false, canDownload: false });
  
  const fileInputRef = useRef(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClassDocuments(classId, currentFolder?.id || null);
      setDocuments(data || []);
    } catch (err) {
      console.error(err);
      setError('Không thể tải danh sách tài liệu.');
    } finally {
      setLoading(false);
    }
  }, [classId, currentFolder]);

  const fetchUserPermissions = useCallback(async () => {
    if (isTeacher) {
      setPermissions({ canUploadDocuments: true, canDownloadDocuments: true });
      return;
    }
    try {
      const data = await getMyClassPermission(classId);
      if (data) {
        setPermissions({
          canUploadDocuments: data.canUploadDocuments,
          canDownloadDocuments: data.canDownloadDocuments
        });
      }
    } catch (err) {
      console.error('Failed to get student class permissions:', err);
    }
  }, [classId, isTeacher]);

  useEffect(() => {
    fetchDocuments();
    fetchUserPermissions();
  }, [classId, currentFolder, fetchDocuments, fetchUserPermissions]);

  const loadPermissionsData = async () => {
    if (!isTeacher) return;
    setLoadingPermissions(true);
    try {
      const data = await getClassStudentPermissions(classId);
      setStudents(data || []);
      
      // Determine bulk toggle initial states based on whether all are true
      if (data && data.length > 0) {
        const allUpload = data.every(s => s.canUploadDocuments);
        const allDownload = data.every(s => s.canDownloadDocuments);
        setBulkPermissions({ canUpload: allUpload, canDownload: allDownload });
      }
    } catch (err) {
      console.error(err);
      alert('Không thể tải cấu hình quyền của sinh viên');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createClassFolder(classId, currentFolder?.id || null, newFolderName.trim());
      setNewFolderName('');
      setShowFolderModal(false);
      fetchDocuments();
    } catch (err) {
      alert(err.message || 'Lỗi khi tạo thư mục');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size client-side first
    if (file.size > 25 * 1024 * 1024) {
      alert('Tệp quá lớn! Kích thước tối đa là 25MB.');
      return;
    }

    // Check unsafe formats
    const blockedExtensions = ['exe', 'msi', 'sh', 'bat', 'cmd', 'js', 'vbs', 'jar', 'com', 'scr', 'apk', 'bin'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (blockedExtensions.includes(ext)) {
      alert('Hệ thống không cho phép tải lên các tệp tin thực thi (.exe, .bat, .sh...) để bảo mật.');
      return;
    }

    try {
      setLoading(true);
      await uploadClassDocument(classId, currentFolder?.id || null, file);
      fetchDocuments();
    } catch (err) {
      alert(err.message || 'Lỗi khi tải tệp lên');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setLoading(false);
    }
  };

  const handleDownloadFile = async (doc) => {
    if (!isTeacher && !permissions.canDownloadDocuments) {
      alert('Bạn chưa được cấp quyền tải tài liệu từ lớp học này!');
      return;
    }
    try {
      const blob = await downloadClassDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Lỗi tải tệp: ' + err.message);
    }
  };

  const handleDeleteDocument = async (docId, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${name}"? Thao tác này không thể khôi phục và sẽ xóa toàn bộ nội dung bên trong nếu là thư mục.`)) {
      return;
    }
    try {
      await deleteClassDocument(docId);
      fetchDocuments();
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa tài liệu');
    }
  };

  const handleToggleStudentPermission = async (studentId, type, currentValue) => {
    setSavingPermissions(true);
    try {
      const targetStudent = students.find(s => s.studentId === studentId);
      const nextUpload = type === 'upload' ? !currentValue : targetStudent.canUploadDocuments;
      const nextDownload = type === 'download' ? !currentValue : targetStudent.canDownloadDocuments;
      
      await updateStudentPermissions(classId, studentId, nextUpload, nextDownload);
      
      // Update local state
      setStudents(students.map(s => 
        s.studentId === studentId 
          ? { ...s, canUploadDocuments: nextUpload, canDownloadDocuments: nextDownload }
          : s
      ));
    } catch (err) {
      alert('Không thể cập nhật quyền: ' + err.message);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleToggleBulkPermission = async (type) => {
    setSavingPermissions(true);
    const nextVal = !bulkPermissions[type === 'upload' ? 'canUpload' : 'canDownload'];
    const nextUpload = type === 'upload' ? nextVal : bulkPermissions.canUpload;
    const nextDownload = type === 'download' ? nextVal : bulkPermissions.canDownload;

    try {
      await updateClassPermissionsBulk(classId, nextUpload, nextDownload);
      setBulkPermissions({ canUpload: nextUpload, canDownload: nextDownload });
      
      // Update all students local state
      setStudents(students.map(s => ({
        ...s,
        canUploadDocuments: nextUpload,
        canDownloadDocuments: nextDownload
      })));
    } catch (err) {
      alert('Không thể cập nhật quyền hàng loạt: ' + err.message);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleEnterFolder = (folder) => {
    setFolderHistory([...folderHistory, folder]);
    setCurrentFolder(folder);
  };


  const handleNavigateToBreadcrumb = (index) => {
    if (index === -1) {
      setFolderHistory([]);
      setCurrentFolder(null);
    } else {
      const newHistory = folderHistory.slice(0, index + 1);
      setFolderHistory(newHistory);
      setCurrentFolder(newHistory[newHistory.length - 1]);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 p-6 transition-all duration-300">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Folder className="w-6 h-6 text-sky-500 fill-sky-500/10" />
            Tài liệu lớp học
          </h2>
          <p className="text-xs text-slate-500 mt-1">Duyệt, tải lên tài liệu học tập và quản lý dữ liệu lưu trữ lớp học</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Views Toggles */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Dạng lưới"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Dạng danh sách"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={fetchDocuments}
            className="p-2 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Teacher settings panel */}
          {isTeacher && (
            <button
              onClick={() => {
                setShowPermissionModal(true);
                loadPermissionsData();
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
            >
              <Settings className="w-3.5 h-3.5" />
              Cấu hình quyền
            </button>
          )}

          {/* Action buttons based on permissions */}
          {permissions.canUploadDocuments && (
            <>
              <button
                onClick={() => setShowFolderModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Thư mục mới
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-lg shadow-md shadow-sky-500/10 hover:shadow-sky-600/20 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                Tải tệp lên
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </>
          )}
        </div>
      </div>

      {/* WARNING NOTIFICATION FOR STUDENTS */}
      {!isTeacher && (!permissions.canDownloadDocuments || !permissions.canUploadDocuments) && (
        <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3.5 mb-5 flex items-start gap-2.5 text-xs text-sky-700">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Về quyền hạn của bạn:</span> 
            {!permissions.canDownloadDocuments && !permissions.canUploadDocuments ? (
              <span> Bạn chỉ được quyền <span className="underline">Xem danh sách</span> tài liệu. Không thể tải lên hoặc tải xuống nếu giáo viên chưa cấp quyền.</span>
            ) : (
              <>
                {!permissions.canDownloadDocuments && <span> Bạn chưa có quyền tải xuống tài liệu.</span>}
                {!permissions.canUploadDocuments && <span> Bạn chưa có quyền tải lên bài tập/tài liệu.</span>}
              </>
            )}
          </div>
        </div>
      )}

      {/* EXPLORER BAR & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-slate-50 border border-slate-100 p-2 rounded-xl">
        {/* Breadcrumb Trail */}
        <div className="flex items-center flex-wrap gap-1 text-sm font-medium text-slate-600 pl-1">
          <button 
            onClick={() => handleNavigateToBreadcrumb(-1)}
            className="hover:text-sky-600 hover:underline transition-all flex items-center gap-1 text-slate-800"
          >
            Tài liệu lớp
          </button>
          
          {folderHistory.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={() => handleNavigateToBreadcrumb(index)}
                className={`hover:text-sky-600 hover:underline transition-all ${index === folderHistory.length - 1 ? 'text-slate-500 pointer-events-none' : 'text-slate-800'}`}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Local Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm trong thư mục hiện tại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* SKELETON LOADER */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-500">Đang tải danh sách tài liệu...</span>
        </div>
      ) : error ? (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-rose-500">
          <AlertCircle className="w-10 h-10" />
          <p className="text-sm font-semibold">{error}</p>
          <button 
            onClick={fetchDocuments} 
            className="mt-2 px-3 py-1.5 text-xs text-white bg-sky-500 hover:bg-sky-600 rounded-lg font-medium transition"
          >
            Thử lại
          </button>
        </div>
      ) : filteredDocs.length === 0 ? (
        /* EMPTY STATE */
        <div className="py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <Folder className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">Thư mục trống</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
            {searchQuery ? 'Không tìm thấy tài liệu phù hợp với tìm kiếm.' : 'Hiện tại thư mục này chưa có bài giảng hoặc tài liệu nào.'}
          </p>
          {permissions.canUploadDocuments && !searchQuery && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition"
            >
              <Upload className="w-3.5 h-3.5" />
              Tải lên tài liệu đầu tiên
            </button>
          )}
        </div>
      ) : (
        /* VIEW MODE RENDERING */
        viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredDocs.map(doc => (
              <div
                key={doc.id}
                onDoubleClick={() => doc.type === 'FOLDER' && handleEnterFolder(doc)}
                className="group relative flex flex-col items-center p-4 border border-slate-100 hover:border-sky-100 rounded-xl hover:bg-sky-50/30 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                {/* Visual Icon */}
                <div 
                  onClick={() => doc.type === 'FOLDER' && handleEnterFolder(doc)}
                  className="w-14 h-14 flex items-center justify-center mb-2"
                >
                  {getFileIcon(doc.type, doc.fileExtension)}
                </div>

                {/* Name */}
                <span className="text-xs font-bold text-slate-700 text-center w-full truncate px-1" title={doc.name}>
                  {doc.name}
                </span>

                {/* Details */}
                <div className="text-[10px] text-slate-400 text-center mt-1 flex flex-col gap-0.5">
                  {doc.type === 'FILE' ? (
                    <>
                      <span>{formatBytes(doc.fileSize)}</span>
                      <span>Bởi: {doc.uploaderName}</span>
                    </>
                  ) : (
                    <span>Thư mục</span>
                  )}
                </div>

                {/* Floating Actions overlay */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.type === 'FILE' && (
                    <button
                      onClick={() => handleDownloadFile(doc)}
                      disabled={!isTeacher && !permissions.canDownloadDocuments}
                      className={`p-1.5 rounded-lg border transition ${
                        isTeacher || permissions.canDownloadDocuments 
                          ? 'text-sky-600 bg-sky-50 border-sky-200 hover:bg-sky-100' 
                          : 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed opacity-50'
                      }`}
                      title={isTeacher || permissions.canDownloadDocuments ? "Tải xuống" : "Chưa được cấp quyền tải"}
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  )}
                  
                  {/* Delete button (Only for teachers, or students who uploaded it and have upload permission) */}
                  {(isTeacher || (permissions.canUploadDocuments && doc.uploaderId === JSON.parse(localStorage.getItem('user'))?.id)) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.id, doc.name);
                      }}
                      className="p-1.5 text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition"
                      title="Xóa"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50/50">
                  <th className="py-3 px-4">Tên tài liệu</th>
                  <th className="py-3 px-4">Loại</th>
                  <th className="py-3 px-4">Kích thước</th>
                  <th className="py-3 px-4">Người đăng</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map(doc => (
                  <tr 
                    key={doc.id}
                    onDoubleClick={() => doc.type === 'FOLDER' && handleEnterFolder(doc)}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition cursor-pointer text-xs font-medium text-slate-700"
                  >
                    <td className="py-3 px-4 flex items-center gap-2">
                      <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                        {getFileIcon(doc.type, doc.fileExtension)}
                      </div>
                      <span 
                        onClick={() => doc.type === 'FOLDER' && handleEnterFolder(doc)}
                        className="font-semibold truncate max-w-[200px] sm:max-w-[300px] hover:text-sky-600 transition" 
                        title={doc.name}
                      >
                        {doc.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {doc.type === 'FOLDER' ? 'Thư mục' : doc.fileExtension?.toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {doc.type === 'FOLDER' ? '-' : formatBytes(doc.fileSize)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {doc.uploaderName}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {doc.type === 'FILE' && (
                          <button
                            onClick={() => handleDownloadFile(doc)}
                            disabled={!isTeacher && !permissions.canDownloadDocuments}
                            className={`p-1.5 rounded-lg border transition ${
                              isTeacher || permissions.canDownloadDocuments 
                                ? 'text-sky-600 bg-sky-50 border-sky-200 hover:bg-sky-100' 
                                : 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed opacity-50'
                            }`}
                            title={isTeacher || permissions.canDownloadDocuments ? "Tải xuống" : "Chưa được cấp quyền"}
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        )}
                        
                        {(isTeacher || (permissions.canUploadDocuments && doc.uploaderId === JSON.parse(localStorage.getItem('user'))?.id)) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc.id, doc.name);
                            }}
                            className="p-1.5 text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition"
                            title="Xóa"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* NEW FOLDER DIALOG MODAL */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Folder className="w-5 h-5 text-amber-500" />
                Tạo thư mục mới
              </h3>
              <button 
                onClick={() => { setShowFolderModal(false); setNewFolderName(''); }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateFolder}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Tên thư mục</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tài liệu ôn thi giữa kỳ"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all"
                  maxLength={100}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setShowFolderModal(false); setNewFolderName(''); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-md shadow-amber-500/10 transition"
                >
                  Tạo thư mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEACHER PERMISSIONS CONFIG MODAL */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-6 border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-4 flex-shrink-0">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-5 h-5 text-sky-500" />
                Cấu hình quyền tài liệu Sinh viên
              </h3>
              <button 
                onClick={() => setShowPermissionModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bulk Actions */}
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl mb-4 flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Users className="w-4 h-4 text-slate-500" />
                  Cấu hình nhanh toàn bộ lớp
                </span>
                <p className="text-slate-400 mt-0.5">Bật hoặc tắt quyền đồng loạt cho tất cả thành viên trong lớp học</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-600 hover:text-slate-800">
                  <input
                    type="checkbox"
                    checked={bulkPermissions.canDownload}
                    onChange={() => handleToggleBulkPermission('download')}
                    disabled={savingPermissions}
                    className="w-4 h-4 rounded text-sky-500 border-slate-300 focus:ring-sky-400 cursor-pointer"
                  />
                  Cho phép Tải xuống
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-600 hover:text-slate-800">
                  <input
                    type="checkbox"
                    checked={bulkPermissions.canUpload}
                    onChange={() => handleToggleBulkPermission('upload')}
                    disabled={savingPermissions}
                    className="w-4 h-4 rounded text-sky-500 border-slate-300 focus:ring-sky-400 cursor-pointer"
                  />
                  Cho phép Tải lên
                </label>
              </div>
            </div>

            {/* Students permissions table list */}
            <div className="overflow-y-auto flex-grow pr-1 mb-4">
              {loadingPermissions ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-400">Đang tải danh sách sinh viên...</span>
                </div>
              ) : students.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Chưa có sinh viên nào đăng ký tham gia lớp học này.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50/50 sticky top-0 bg-white">
                      <th className="py-2.5 px-3">MSSV</th>
                      <th className="py-2.5 px-3">Họ và Tên</th>
                      <th className="py-2.5 px-3 text-center">Quyền Tải xuống</th>
                      <th className="py-2.5 px-3 text-center">Quyền Tải lên</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.studentId} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs text-slate-700">
                        <td className="py-2.5 px-3 font-semibold">{s.studentCode}</td>
                        <td className="py-2.5 px-3">{s.studentName}</td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={s.canDownloadDocuments}
                            onChange={() => handleToggleStudentPermission(s.studentId, 'download', s.canDownloadDocuments)}
                            disabled={savingPermissions}
                            className="w-4 h-4 rounded text-sky-500 border-slate-300 focus:ring-sky-400 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={s.canUploadDocuments}
                            onChange={() => handleToggleStudentPermission(s.studentId, 'upload', s.canUploadDocuments)}
                            disabled={savingPermissions}
                            className="w-4 h-4 rounded text-sky-500 border-slate-300 focus:ring-sky-400 cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-150 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowPermissionModal(false)}
                className="px-5 py-2 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-lg shadow-md shadow-sky-500/15 transition"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
