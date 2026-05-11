from setuptools import setup, find_packages

setup(
    name="orbita-auth",
    version="0.1.0",
    description="Shared authentication utilities for ORBITA platform services",
    packages=find_packages(),
    install_requires=[
        "python-jose[cryptography]>=3.3.0",
        "fastapi>=0.100.0",
        "pydantic>=2.0.0",
        "httpx>=0.24.0",
    ],
    python_requires=">=3.10",
)
