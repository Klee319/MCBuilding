import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { structuresApi } from '../../api/structures';
import { postsApi } from '../../api/posts';

type UploadStep = 'file' | 'details' | 'uploading' | 'complete';

export default function UploadPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  // Upload state
  const [step, setStep] = useState<UploadStep>('file');
  const [file, setFile] = useState<File | null>(null);
  const [structureId, setStructureId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [edition, setEdition] = useState<'java' | 'bedrock'>('java');
  const [version, setVersion] = useState('1.20.4');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');

  // UI state
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // All useCallback hooks must be before any conditional returns (React hooks rules)
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateAndSetFile = useCallback((selectedFile: File) => {
    const validExtensions = ['.schematic', '.schem', '.litematic', '.mcstructure'];
    const extension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));

    if (!validExtensions.includes(extension)) {
      setError('対応形式は .schematic, .schem, .litematic, .mcstructure です');
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('ファイルサイズは100MB以下にしてください');
      return;
    }

    setError('');
    setFile(selectedFile);

    // Auto-detect edition from file extension
    if (extension === '.mcstructure') {
      setEdition('bedrock');
    } else {
      setEdition('java');
    }

    // Use filename as default title
    const baseName = selectedFile.name.slice(0, selectedFile.name.lastIndexOf('.'));
    if (!title) {
      setTitle(baseName);
    }
  }, [title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, [validateAndSetFile]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">ログインが必要です</h1>
        <p className="text-gray-600 mb-6">建築データを投稿するにはログインしてください。</p>
        <button onClick={() => navigate('/login')} className="btn-primary">
          ログイン
        </button>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleUploadFile = async () => {
    if (!file) return;

    setStep('uploading');
    setError('');
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await structuresApi.upload(file, {
        originalEdition: edition,
        originalVersion: version,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success && response.data) {
        setStructureId(response.data.id);
        setStep('details');
      } else {
        setError(response.error?.message || 'アップロードに失敗しました');
        setStep('file');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
      setStep('file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!structureId) {
      setError('先にファイルをアップロードしてください');
      return;
    }

    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    setStep('uploading');
    setError('');

    try {
      const tagList = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const trimmedDescription = description.trim();
      const createParams: {
        structureId: string;
        title: string;
        description?: string;
        tags?: string[];
        visibility?: 'public' | 'private' | 'unlisted';
      } = {
        structureId,
        title: title.trim(),
        visibility,
      };

      if (trimmedDescription) {
        createParams.description = trimmedDescription;
      }

      if (tagList.length > 0) {
        createParams.tags = tagList;
      }

      const response = await postsApi.create(createParams);

      if (response.success && response.data) {
        const postId = response.data.id;
        setStep('complete');
        setTimeout(() => {
          navigate(`/post/${postId}`);
        }, 1500);
      } else {
        setError(response.error?.message || '投稿に失敗しました');
        setStep('details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
      setStep('details');
    }
  };

  // Step: File Upload
  if (step === 'file' || !structureId) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">建築データを投稿</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* File Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {file ? (
            <div>
              <div className="text-4xl mb-3">📦</div>
              <p className="text-gray-900 font-medium text-lg">{file.name}</p>
              <p className="text-gray-500 text-sm mt-1">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-sm text-red-600 hover:text-red-700 mt-3"
              >
                ファイルを削除
              </button>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-3">📁</div>
              <p className="text-gray-600 mb-3">
                ファイルをドラッグ&ドロップ
              </p>
              <input
                type="file"
                accept=".schematic,.schem,.litematic,.mcstructure"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="btn-secondary cursor-pointer">
                ファイルを選択
              </label>
              <p className="text-xs text-gray-400 mt-3">
                対応形式: .schematic, .schem, .litematic, .mcstructure (最大100MB)
              </p>
            </>
          )}
        </div>

        {file && (
          <>
            {/* Edition & Version Selection */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  エディション
                </label>
                <select
                  value={edition}
                  onChange={(e) => setEdition(e.target.value as 'java' | 'bedrock')}
                  className="input"
                >
                  <option value="java">Java版</option>
                  <option value="bedrock">統合版</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  バージョン
                </label>
                <select
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="input"
                >
                  <option value="1.21">1.21</option>
                  <option value="1.20.4">1.20.4</option>
                  <option value="1.20">1.20</option>
                  <option value="1.19.4">1.19.4</option>
                  <option value="1.19">1.19</option>
                  <option value="1.18">1.18</option>
                  <option value="1.17">1.17</option>
                  <option value="1.16">1.16</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary flex-1"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleUploadFile}
                className="btn-primary flex-1"
              >
                次へ
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Step: Uploading
  if (step === 'uploading') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {uploadProgress < 100 ? 'アップロード中...' : '処理中...'}
        </h2>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">{uploadProgress}%</p>
      </div>
    );
  }

  // Step: Complete
  if (step === 'complete') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">投稿が完了しました！</h2>
        <p className="text-gray-600">投稿ページに移動します...</p>
      </div>
    );
  }

  // Step: Details
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">投稿の詳細</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* File info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center gap-4">
        <div className="text-3xl">📦</div>
        <div>
          <p className="font-medium text-gray-900">{file?.name}</p>
          <p className="text-sm text-gray-500">
            {edition === 'java' ? 'Java版' : '統合版'} {version}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            タイトル *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="建築のタイトル"
            required
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            説明
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input h-32 resize-none"
            placeholder="建築の説明を入力..."
            maxLength={2000}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            タグ（カンマ区切り）
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="input"
            placeholder="城, 中世, ファンタジー"
          />
          <p className="text-xs text-gray-500 mt-1">最大5つまで</p>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            公開設定
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={(e) => setVisibility(e.target.value as 'public')}
                className="text-blue-600"
              />
              <div>
                <p className="font-medium text-gray-900">公開</p>
                <p className="text-sm text-gray-500">誰でも閲覧・検索可能</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="visibility"
                value="unlisted"
                checked={visibility === 'unlisted'}
                onChange={(e) => setVisibility(e.target.value as 'unlisted')}
                className="text-blue-600"
              />
              <div>
                <p className="font-medium text-gray-900">限定公開</p>
                <p className="text-sm text-gray-500">URLを知っている人のみ閲覧可能</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === 'private'}
                onChange={(e) => setVisibility(e.target.value as 'private')}
                className="text-blue-600"
              />
              <div>
                <p className="font-medium text-gray-900">非公開</p>
                <p className="text-sm text-gray-500">自分だけが閲覧可能</p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => {
              setStructureId(null);
              setStep('file');
            }}
            className="btn-secondary flex-1"
          >
            戻る
          </button>
          <button type="submit" className="btn-primary flex-1">
            投稿する
          </button>
        </div>
      </form>
    </div>
  );
}
