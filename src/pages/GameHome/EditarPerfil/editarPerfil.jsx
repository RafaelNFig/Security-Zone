import React from "react";
import { X, Camera, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function EditarPerfil() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white p-6">
      <div className="bg-slate-800/60 rounded-2xl shadow-xl border border-yellow-500/30 w-full max-w-5xl flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar */}
        <div className="bg-slate-900/80 w-full md:w-1/3 flex flex-col items-center py-10 border-r border-yellow-500/30">
          <div className="relative w-28 h-28 rounded-full bg-slate-700 flex items-center justify-center mb-6">
            <Camera size={36} className="text-yellow-400" />
          </div>

          <button className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 w-40 py-2 rounded-lg mb-4 transition">
            Edit Profile
          </button>
          <button className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 w-40 py-2 rounded-lg mb-4 transition">
            History
          </button>
          <button className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 w-40 py-2 rounded-lg transition">
            Settings
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-10 py-8 relative">
          <X
            onClick={() => navigate("/gamehome")}
            className="absolute top-5 right-5 text-gray-400 hover:text-red-500 cursor-pointer transition"
            size={22}
          />

          <h2 className="text-2xl font-bold text-yellow-400 mb-8">Edit Profile</h2>

          <div className="flex flex-col gap-6">
            {/* Username */}
            <div>
              <label className="block text-gray-300 mb-2">Username</label>
              <div className="flex items-center bg-slate-700 rounded-lg px-4 py-2">
                <input
                  type="text"
                  placeholder="Your username"
                  className="flex-1 bg-transparent outline-none text-white placeholder-gray-400"
                />
                <Edit2 size={18} className="text-yellow-400 cursor-pointer" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-300 mb-2">Email</label>
              <div className="flex items-center bg-slate-700 rounded-lg px-4 py-2">
                <input
                  type="email"
                  placeholder="you@email.com"
                  className="flex-1 bg-transparent outline-none text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-300 mb-2">Password</label>
              <div className="flex items-center bg-slate-700 rounded-lg px-4 py-2">
                <input
                  type="password"
                  placeholder="********"
                  className="flex-1 bg-transparent outline-none text-white placeholder-gray-400"
                />
                <Edit2 size={18} className="text-yellow-400 cursor-pointer" />
              </div>
            </div>

            {/* Google Link */}
            <div className="flex items-center gap-4 mt-4">
              <img
                src="https://www.google.com/favicon.ico"
                alt="Google"
                className="w-5 h-5"
              />
              <span className="text-gray-400 text-sm">Link our account</span>
            </div>

            <div className="mt-8 flex justify-end">
              <button className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold px-8 py-2 rounded-lg transition">
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
