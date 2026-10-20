import React from 'react'

const Navbar = () => {
    return (
        <div className="min-h-screen flex items-start justify-center bg-[#0B0F1A]">
            <nav className="mt-3 fixed top-6 bg-[#111827] px-10 py-4 rounded-full flex gap-12 text-xl text-white shadow-lg">
                <a href="#sobre" className="inline-block transition hover:scale-110">
                    X
                </a>
                <a href="#projetos" className="inline-block transition hover:scale-110">
                    X
                </a>
            </nav>
        </div>
    )
}

export default Navbar