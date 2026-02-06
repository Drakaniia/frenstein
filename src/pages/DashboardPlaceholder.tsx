import { Link } from "react-router-dom";

const DashboardPlaceholder = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
            <h1 className="text-4xl font-bold mb-4">Dashboard Unavailable</h1>
            <p className="text-lg text-muted-foreground mb-8 text-center max-w-md">
            </p>
            <Link
                to="/"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
                Return Home
            </Link>
        </div>
    );
};

export default DashboardPlaceholder;
