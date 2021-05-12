import { Ydb } from '../proto/bundle';
import IOperation = Ydb.Operations.IOperation;
export declare enum StatusCode {
    STATUS_CODE_UNSPECIFIED = 0,
    SUCCESS = 400000,
    BAD_REQUEST = 400010,
    UNAUTHORIZED = 400020,
    INTERNAL_ERROR = 400030,
    ABORTED = 400040,
    UNAVAILABLE = 400050,
    OVERLOADED = 400060,
    SCHEME_ERROR = 400070,
    GENERIC_ERROR = 400080,
    TIMEOUT = 400090,
    BAD_SESSION = 400100,
    PRECONDITION_FAILED = 400120,
    ALREADY_EXISTS = 400130,
    NOT_FOUND = 400140,
    SESSION_EXPIRED = 400150,
    CANCELLED = 400160,
    UNDETERMINED = 400170,
    UNSUPPORTED = 400180,
    SESSION_BUSY = 400190,
    CONNECTION_LOST,
    CONNECTION_FAILURE,
    DEADLINE_EXCEEDED,
    CLIENT_INTERNAL_ERROR,
    UNIMPLEMENTED,
    UNAUTHENTICATED,
    SESSION_POOL_EMPTY
}
export declare class YdbError extends Error {
    static formatIssues(issues?: null | any[]): string;
    static checkStatus(operation: IOperation): void;
    static status: StatusCode;
    issues: any[] | null;
    constructor(message: string, issues?: null | any[]);
}
export declare class ConnectionError extends YdbError {
}
export declare class ConnectionFailure extends ConnectionError {
    static status: StatusCode;
}
export declare class ConnectionLost extends ConnectionError {
    static status: StatusCode;
}
export declare class DeadlineExceed extends ConnectionError {
    static status: StatusCode;
}
export declare class Unimplemented extends ConnectionError {
    static status: StatusCode;
}
export declare class Unauthenticated extends YdbError {
    static status: StatusCode;
}
export declare class SessionPoolEmpty extends YdbError {
    static status: StatusCode;
}
export declare class BadRequest extends YdbError {
    static status: StatusCode;
}
export declare class Unauthorized extends YdbError {
    static status: StatusCode;
}
export declare class InternalError extends YdbError {
    static status: StatusCode;
}
export declare class Aborted extends YdbError {
    static status: StatusCode;
}
export declare class Unavailable extends YdbError {
    static status: StatusCode;
}
export declare class Overloaded extends YdbError {
    static status: StatusCode;
}
export declare class SchemeError extends YdbError {
    static status: StatusCode;
}
export declare class GenericError extends YdbError {
    static status: StatusCode;
}
export declare class BadSession extends YdbError {
    static status: StatusCode;
}
export declare class Timeout extends YdbError {
    static status: StatusCode;
}
export declare class PreconditionFailed extends YdbError {
    static status: StatusCode;
}
export declare class NotFound extends YdbError {
    static status: StatusCode;
}
export declare class AlreadyExists extends YdbError {
    static status: StatusCode;
}
export declare class SessionExpired extends YdbError {
    static status: StatusCode;
}
export declare class Cancelled extends YdbError {
    static status: StatusCode;
}
export declare class Undetermined extends YdbError {
    static status: StatusCode;
}
export declare class Unsupported extends YdbError {
    static status: StatusCode;
}
export declare class SessionBusy extends YdbError {
    static status: StatusCode;
}
export declare class MissingOperation extends YdbError {
}
export declare class MissingValue extends YdbError {
}
export declare class MissingStatus extends YdbError {
}
export declare class TimeoutExpired extends YdbError {
}
